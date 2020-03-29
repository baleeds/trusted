# Trusted

[![npm version](https://badge.fury.io/js/trusted.svg)](https://badge.fury.io/js/trusted)
![CI](https://github.com/baleeds/trusted/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/baleeds/trusted/branch/master/graph/badge.svg)](https://codecov.io/gh/baleeds/trusted)

Make localStorage trusted by solving three problems:

- Validate localStorage values against a schema, or using a custom validation function.
- Set default values to prevent receiving null values.
- Prevent designating the same key multiple times.

## Install

Install using npm or yarn.

```
npm install --save trusted
```

or

```
yarn add trusted
```

## Basic Usage

```javascript
// Create a new trusted storage.
const trusted = new Trusted();

// Register a new key/value pair to receive an accessor.
const greeting = trusted.string({ key: 'greeting' });

// Use the accessor to get and set the associated value
greeting.set('hello');
greeting.get(); // 'hello'
```

## Adding Validations

Validations are configured at the time when the key/value pair is registered.

Validations can be done using a [Yup](https://github.com/jquense/yup) schema.

```javascript
const greeting = trusted.string({
  key: 'greeting',
  yupSchema: Yup.string().min(3),
});

greeting.set('hi'); // console.error
greeting.get(); // undefined

greeting.set('hello');
greeting.get(); // 'hello'
```

Or validations can be done manually using a `validate` function, which returns `true` for valid values.

```javascript
const greeting = trusted.string({
  key: 'greeting',
  validation: value => value.length > 3, // return true for valid values.
});

greeting.set('hi'); // console.error
greeting.get(); // undefined

greeting.set('hello');
greeting.get(); // 'hello'
```

## Adding Default Values

Default values are returned when the value being retrieved is null or fails validation. Default values must pass validation, if a validation or schema is available.

```javascript
const greeting = trusted.string({
  key: 'greeting',
  yupSchema: Yup.string().oneOf(['hello', 'hola']),
  defaultValue: 'hello',
});

greeting.get(); // 'hello'
localStorage.setItem('greeting', 'sup'); // Manually set invalid value
greeting.get(); // 'hello'
```

## Schema Accessor Types

The schema supports several built in accessor types.

```javascript
trusted.string({ key: 'greeting', defaultValue: 'hello' });

trusted.boolean({ key: 'isGreeting', default: true });

trusted.number({ key: 'timesGreeted', default: 5 });

trusted.object({ key: 'greeter', default: { id: '1', name: 'John Doe' } });

trusted.array({ key: 'availableGreetings', defaultValue: ['hello', 'hola'] });

trusted.map({
  key: 'greetingByLanguage',
  defaultValue: new Map([
    ['en', 'hello'],
    ['es', 'hola'],
  ]),
});

trusted.set({
  key: 'availableGreetings',
  defaultValue: new Set(['hello', 'hola']),
});
```

Custom accessors can be created, allowing for user-defined marshaling.

```javascript
trusted.accessor({
  key: 'greeting',
  marshal: item => item.toString(), // item will be marshaled into string form for localStorage
  unmarshal: string => new Item(string), // string will be unmarshaled back into an Item
});
```

# API Reference

## Trusted

`Trusted` is the provisioner of new accessors. It maintains global configuration and ensures key uniqueness.

### Example

```javascript
const trusted = new Trusted(options);
```

### Options

`namespace?: string`

String to be used as a prefix for all entries in localStorage.

### Methods

`registerKey: (key: string) => void`

Register a new key. Keys are automatically registered when a new accessor is provisioned, unless otherwise specified. If the provided key is already registered, and exception is thrown.

`unregisterKey: (key: string) => void`

Unregister a key. Keys are never unregistered automatically.

`accessor<T>: (options: TrustedAccessorOptions<T>) => TrustedAccessor<T>`

Provision a new accessor. Accessors can be provided with custom marshaling for localStorage compatibility. Provisioning a new accessor will automatically register the provided key.

`string<T = string>: (options: TrustedTypeAccessorOptions<T>) => TrustedAccessor<T>`

Provision a string accessor. Providing a type enable using the string accessor for unions or enums.

`boolean: (options: TrustedTypeAccessorOptions<boolean>) => TrustedAccessor<boolean>`

Provision a boolean accessor.

`number: (options: TrustedTypeAccessorOptions<number>) => TrustedAccessor<number>`

Provision a number accessor.

`object<T extends Record<any, any>>: (options: TrustedTypeAccessorOptions<T>) => TrustedAccessor<T>`

Provision an object accessor.

`array<T extends Array<any>>: (options: TrustedTypeAccessorOptions<T>) => TrustedAccessor<T>`

Provision an array accessor.

`map<K extends string | number | symbol, T>: (accessorOptions: TrustedTypeAccessorOptions<Map<K, T>>) => TrustedAccessor<Map<K, T>>`

Provision a Map accessor.

`set<T extends Set<any>>: (options: TrustedTypeAccessorOptions<T>) => TrustedAccessor<T>`

Provision a Set accessor.

## TrustedAccessor

Accessors are used to safely get and set values in localStorage. Accessors pertain to a specific key and hold configuration for validation, default values, and marshaling.

### Example

```typescript
const greeter = trusted.object<Greeter>({
  key: 'greeter',
  defaultValue: {
    id: '1',
    name: 'Luke',
  },
  yupSchema: Yup.object().shape({
    id: Yup.string().required(),
    name: Yup.string().required(),
  }),
});
```

### TrustedAccessorOptions<T>

`key: string`

Key to be used for storing value in localStorage. Keys are automatically registered when the accessor is provisioned, meaning they can't be used more than once, unless otherwise specified.

`defaultValue?: T`

Default value to be return from `get()` when the localStorage value is null or fails validation. If the default value fails validation, an exception is thrown.

`yupSchema?: Schema<T>`

[Yup](https://github.com/jquense/yup) schema to be used for validation. Validation runs on `get()` and `set()`.

`validate?: (value: T) => boolean`

Function that returns true for valid options, and false otherwise. Validation runs on `get()` and `set()`.

`skipRegistration?: boolean`

When an accessor needs to be provisioned more than once for the same key, registration must be skipped, otherwise the duplicate key will be prevented. When true, `skipRegistration` will completely ignore the key registry.

`marshal?: (value: T) => string`

Only available for `Trusted.accessor`. Marshaling is used to "stringify" values which don't have a reversible `toString` or `JSON.stringiy()` result. Examples include Maps and Sets. The `marshal` function should accept a value and return its string representation.

`unmarshal?: (localString: string) => value`

Only available for `Trusted.accessor`. Unmarshaling is used to reverse the marshaling provided above. The `unmarshal` function should take a string representation and return the hydrated item.

### Methods

`get: () => T | undefined`

Gets the unmarshaled value from localStorage. If the item is not found in localStorage, the default value will be returned. If the default value is returned, the localStorage value will be set to the marshaled default value.

`set: (value: T) => void`

Sets a marshaled value in localStorage. If the item fails validation, an error is logged and `set` results in a no-op.

`remove: () => void`

Remove the value from localStorage.

`unregister: () => void`

Unregister the accessor's key from the Trusted key registry.

`getKey: () => string`

Return the accessor's key.

`getDefaultValue: () => T | undefined`

Return the accessor's default value, if one was provided.
