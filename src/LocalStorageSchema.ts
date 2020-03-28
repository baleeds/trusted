import { Schema } from 'yup';

export interface LocalStorageSchemaOptions {
  prefix?: string;
}

export interface StorageAccessorOptions<T> {
  key: string;
  defaultValue?: T;
  yupSchema?: Schema<T>;
  validate?: (value: T) => boolean;
  unmarshal?: (localValue: string) => T;
  marshal?: (value: T) => string;
}

export type TypeStorageAccessorOptions<T> = Omit<
  StorageAccessorOptions<T>,
  'marshal' | 'unmarshal'
>;

export interface StorageAccessor<T> {
  get: () => T | undefined;
  set: (value: T) => void;
  remove: () => void;
  getKey: () => string;
  getDefaultValue: () => T | undefined;
}

export class LocalStorageSchema {
  private prefix: string | undefined;

  constructor(options: LocalStorageSchemaOptions = {}) {
    const { prefix } = options;
    this.prefix = prefix;
  }

  accessor<T = any>(
    accessorOptions: StorageAccessorOptions<T>
  ): StorageAccessor<T> {
    const key = `${this.prefix || ''}${accessorOptions.key}`;

    const {
      defaultValue,
      yupSchema,
      validate = yupSchema
        ? (value: T) => yupSchema.isValidSync(value)
        : undefined,
      unmarshal,
      marshal,
    } = accessorOptions;

    return {
      get() {
        if (defaultValue && validate && !validate(defaultValue)) {
          throw new Error(
            `Invalid default value provided at key: ${key}.  Please check your yupSchema.`
          );
        }

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
          } else {
            console.warn(
              `You have provided a non-string default value without a marshal function. This may result in mismatched types.\nkey: ${key}\ndefault value: ${defaultValue}`
            );
            localStorage.setItem(key, (defaultValue as unknown) as string);
          }
          return defaultValue;
        }
      },
      set(value: T) {
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
            `You have set a non-string value in local storage without marshaling. This may result in mismatched types.\nkey: ${key}\nvalue: ${value}`
          );
          localStorage.setItem(key, (value as unknown) as string);
        }
      },
      remove() {
        localStorage.removeItem(key);
      },
      getDefaultValue() {
        return accessorOptions.defaultValue;
      },
      getKey() {
        return key;
      },
    };
  }

  string<T extends string = string>(
    accessorOptions: TypeStorageAccessorOptions<T>
  ) {
    return this.accessor<T>(accessorOptions);
  }

  boolean(accessorOptions: TypeStorageAccessorOptions<boolean>) {
    return this.accessor<boolean>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  object<T extends Record<any, any>>(
    accessorOptions: TypeStorageAccessorOptions<T>
  ) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  number(accessorOptions: TypeStorageAccessorOptions<number>) {
    return this.accessor<number>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  array<T extends Array<any>>(accessorOptions: TypeStorageAccessorOptions<T>) {
    return this.accessor<T>({
      ...accessorOptions,
      marshal: JSON.stringify,
      unmarshal: JSON.parse,
    });
  }

  map<K extends string | number | symbol, T>(
    accessorOptions: TypeStorageAccessorOptions<Map<K, T>>
  ) {
    return this.accessor<Map<K, T>>({
      ...accessorOptions,
      marshal: (map: Map<K, T>) => JSON.stringify(Array.from(map)),
      unmarshal: (localValue: string) => new Map<K, T>(JSON.parse(localValue)),
    });
  }
}
