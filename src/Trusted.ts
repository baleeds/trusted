import { Schema } from 'yup';

export interface TrustedOptions {
  namespace?: string;
}

export interface TrustedAccessorOptions<T> {
  key: string;
  defaultValue?: T;
  yupSchema?: Schema<T>;
  validate?: (value: T) => boolean;
  skipRegistration?: boolean;
  unmarshal?: (localValue: string) => T;
  marshal?: (value: T) => string;
}

export type TrustedTypeAccessorOptions<T> = Omit<
  TrustedAccessorOptions<T>,
  'marshal' | 'unmarshal'
>;

export interface TrustedAccessor<T> {
  get: () => T | undefined;
  set: (value: T) => void;
  remove: () => void;
  unregister: () => void;
  getKey: () => string;
  getDefaultValue: () => T | undefined;
}

export class Trusted {
  private namespace: string | undefined;
  private registeredKeys: Set<string>;

  constructor(options: TrustedOptions = {}) {
    const { namespace } = options;
    this.namespace = namespace;
    this.registeredKeys = new Set();
    this.accessor.bind(this);
  }

  registerKey(key: string) {
    if (this.registeredKeys.has(key)) {
      throw new Error(`Key has already been registered: ${key}`);
    }
    this.registeredKeys.add(key);
  }

  unregisterKey(key: string) {
    this.registeredKeys.delete(key);
  }

  accessor<T = any>(
    accessorOptions: TrustedAccessorOptions<T>
  ): TrustedAccessor<T> {
    const key = `${this.namespace || ''}${accessorOptions.key}`;

    const {
      defaultValue,
      yupSchema,
      skipRegistration,
      validate = yupSchema
        ? (value: T) => yupSchema.isValidSync(value)
        : undefined,
      unmarshal,
      marshal,
    } = accessorOptions;

    if (defaultValue && validate && !validate(defaultValue)) {
      throw new Error(
        `Invalid default value provided at key: ${key}.  Please check your yupSchema.`
      );
    }

    if (defaultValue && typeof defaultValue !== 'string' && !marshal) {
      throw new Error(
        `Invalid configuration provided at key: ${key}.  Non-string default values must be accompanied by a marshal function.`
      );
    }

    if (!skipRegistration) {
      this.registerKey(key);
    }

    return {
      get: () => {
        let item;
        try {
          item = localStorage.getItem(key);
          if (!item) {
            throw new Error(`Item not found at key: ${key}.`);
          }

          item = unmarshal ? unmarshal(item) : item;

          if (validate && !validate(item as T)) {
            throw new Error(`Item is invalid at key: ${key}.`);
          }

          return item as T;
        } catch (e) {
          if (marshal && defaultValue) {
            localStorage.setItem(key, marshal(defaultValue));
          } else if (typeof defaultValue === 'string') {
            localStorage.setItem(key, defaultValue);
          } else if (defaultValue === undefined) {
            localStorage.removeItem(key);
          }
          return defaultValue;
        }
      },
      set: (value: T) => {
        if (validate && !validate(value)) {
          console.error(`Invalid value provided at key: ${key}.`, value);
          return;
        }
        if (marshal) {
          localStorage.setItem(key, marshal(value));
        } else if (typeof value === 'string') {
          localStorage.setItem(key, value);
        } else {
          console.warn(
            `You have attempted to set a non-string value in local storage without marshaling. This operation has been prevented.\nkey: ${key}\nvalue: ${value}`
          );
        }
      },
      remove: () => {
        localStorage.removeItem(key);
      },
      unregister: () => {
        this.unregisterKey(key);
      },
      getDefaultValue: () => {
        return accessorOptions.defaultValue;
      },
      getKey: () => {
        return key;
      },
    };
  }

  string<T extends string = string>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ) {
    return this.accessor<T>(accessorOptions);
  }

  boolean(accessorOptions: TrustedTypeAccessorOptions<boolean>) {
    return this.accessor<boolean>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  object<T extends Record<any, any>>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  number(accessorOptions: TrustedTypeAccessorOptions<number>) {
    return this.accessor<number>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  array<T>(accessorOptions: TrustedTypeAccessorOptions<T[]>) {
    return this.accessor<T[]>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  map<K extends string | number | symbol, T>(
    accessorOptions: TrustedTypeAccessorOptions<Map<K, T>>
  ) {
    return this.accessor<Map<K, T>>({
      ...accessorOptions,
      marshal: (map: Map<K, T>) => JSON.stringify(Array.from(map)),
      unmarshal: (localString: string) =>
        new Map<K, T>(JSON.parse(localString)),
    });
  }

  set<T>(accessorOptions: TrustedAccessorOptions<Set<T>>) {
    return this.accessor<Set<T>>({
      ...accessorOptions,
      marshal: (set: Set<T>) => JSON.stringify(Array.from(set)),
      unmarshal: (localString: string) => new Set<T>(JSON.parse(localString)),
    });
  }
}
