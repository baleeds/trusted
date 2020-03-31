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
  get: () => T;
  set: (value: T) => void;
  remove: () => void;
  unregister: () => void;
  getKey: () => string;
  getDefaultValue: () => T;
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

  accessor<T>(
    options: TrustedAccessorOptions<T> & { defaultValue: T }
  ): TrustedAccessor<T>;
  accessor<T>(
    options: TrustedAccessorOptions<T>
  ): TrustedAccessor<T | undefined>;
  accessor<T>(
    options: TrustedAccessorOptions<T>
  ): TrustedAccessor<T | undefined> {
    const key = `${this.namespace || ''}${options.key}`;

    const {
      yupSchema,
      skipRegistration,
      validate = yupSchema
        ? (value: T) => yupSchema.isValidSync(value)
        : undefined,
      unmarshal,
      marshal,
      defaultValue,
    } = options;

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
      set: value => {
        if (validate && value && !validate(value)) {
          console.error(`Invalid value provided at key: ${key}.`, value);
          return;
        }
        if (marshal && value) {
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
        return defaultValue;
      },
      getKey: () => {
        return key;
      },
    };
  }

  string<T extends string = string>(
    accessorOptions: TrustedTypeAccessorOptions<T> & { defaultValue: T }
  ): TrustedAccessor<T>;
  string<T extends string = string>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ): TrustedAccessor<T | undefined>;
  string<T extends string = string>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ) {
    return this.accessor<T>(accessorOptions);
  }

  boolean<T extends boolean = boolean>(
    accessorOptions: TrustedTypeAccessorOptions<T> & { defaultValue: T }
  ): TrustedAccessor<T>;
  boolean<T extends boolean = boolean>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ): TrustedAccessor<T | undefined>;
  boolean<T extends boolean = boolean>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  object<T extends Record<any, any>>(
    accessorOptions: TrustedTypeAccessorOptions<T> & { defaultValue: T }
  ): TrustedAccessor<T>;
  object<T extends Record<any, any>>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ): TrustedAccessor<T | undefined>;
  object<T extends Record<any, any>>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  number<T extends number = number>(
    accessorOptions: TrustedTypeAccessorOptions<T> & { defaultValue: T }
  ): TrustedAccessor<T>;
  number<T extends number = number>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ): TrustedAccessor<T | undefined>;
  number<T extends number = number>(
    accessorOptions: TrustedTypeAccessorOptions<T>
  ) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  array<T, A extends T[] = T[]>(
    accessorOptions: TrustedTypeAccessorOptions<A> & {
      defaultValue: A;
    }
  ): TrustedAccessor<A>;
  array<T, A extends T[] = T[]>(
    accessorOptions: TrustedTypeAccessorOptions<A>
  ): TrustedAccessor<A | undefined>;
  array<T, A extends T[] = T[]>(
    accessorOptions: TrustedTypeAccessorOptions<A>
  ) {
    return this.accessor<A>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  map<K extends string | number | symbol, T, M extends Map<K, T> = Map<K, T>>(
    accessorOptions: TrustedTypeAccessorOptions<M> & { defaultValue: M }
  ): TrustedAccessor<M>;
  map<K extends string | number | symbol, T, M extends Map<K, T> = Map<K, T>>(
    accessorOptions: TrustedTypeAccessorOptions<M>
  ): TrustedAccessor<M | undefined>;
  map<K extends string | number | symbol, T, M extends Map<K, T> = Map<K, T>>(
    accessorOptions: TrustedTypeAccessorOptions<M>
  ) {
    return this.accessor<M>({
      ...accessorOptions,
      marshal: (map: M) => JSON.stringify(Array.from(map)),
      unmarshal: (localString: string) =>
        new Map<K, T>(JSON.parse(localString)) as M,
    });
  }

  set<T, S extends Set<T> = Set<T>>(
    accessorOptions: TrustedAccessorOptions<S>
  ) {
    return this.accessor<S>({
      ...accessorOptions,
      marshal: (set: S) => JSON.stringify(Array.from(set)),
      unmarshal: (localString: string) =>
        new Set<T>(JSON.parse(localString)) as S,
    });
  }

  date<T extends Date>(
    accessorOptions: TrustedAccessorOptions<T> & { defaultValue: T }
  ): TrustedAccessor<T>;
  date<T extends Date>(
    accessorOptions: TrustedAccessorOptions<T>
  ): TrustedAccessor<T | undefined>;
  date<T extends Date>(accessorOptions: TrustedAccessorOptions<T>) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: value => value.toISOString(),
      unmarshal: (localString: string) => new Date(localString) as T,
    });
  }
}
