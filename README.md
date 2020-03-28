# LocalStorage Schema

LocalStorage Schema solves three main problems:

- Validate localStorage values against a schema, or using a custom validation function.
- Set default values to prevent receiving null values.
- Prevent designating the same key multiple times.

## Install

Install using npm or yarn.

```
npm install --save localstorage-schema
```

or

```
yarn add localstorage-schema
```

## Basic Usage

```javascript
// Create a new schema.
const schema = new LocalStorageSchema();

// Register a new key/value pair to receive an accessor.
const greeting = schema.string({ key: 'greeting' });

// Use the accessor to get and set the associated value
greeting.set('hello');
greeting.get(); // 'hello'
```

## Adding Validations

Validations are configured at the time when the key/value pair is registered.

Validations can be done using a [Yup](https://github.com/jquense/yup) schema.

```javascript
const greeting = schema.string({
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
const greeting = schema.string({
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
const greeting = schema.string({
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
schema.string({ key: 'greeting', defaultValue: 'hello' });

schema.boolean({ key: 'isGreeting', default: true });

schema.number({ key: 'timesGreeted', default: 5 });

schema.object({ key: 'greeter', default: { id: '1', name: 'John Doe' } });

schema.array({ key: 'availableGreetings', defaultValue: ['hello', 'hola'] });

schema.map({
  key: 'greetingByLanguage',
  defaultValue: new Map([
    ['en', 'hello'],
    ['es', 'hola'],
  ]),
});

schema.set({
  key: 'availableGreetings',
  defaultValue: new Set(['hello', 'hola']),
});
```

Custom accessors can be created, allowing for user-defined marshaling.

```javascript
schema.accessor({
  key: 'greeting',
  marshal: item => item.toString(), // item will be marshaled into string form for localStorage
  unmarshal: string => new Item(string), // string will be unmarshaled back into an Item
});
```

## API Reference

### LocalStorageSchema

```javascript
new LocalStorageSchema(options);
```

| Option     | Type   | Default | Description                                                   |
| ---------- | ------ | ------- | ------------------------------------------------------------- |
| namespace? | string | --      | String to be used as a prefix for all entries in localStorage |

### Accessor

```javascript
schema.accessor(options);
```

| Option            | Type                  | Default | Description                                                                                                                                          |
| ----------------- | --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| key               | string                | --      | String to be used as key for localStorage. Will be prefixed with schema's namespace.                                                                 |
| defaultValue?     | T                     | --      | Value to be returned by `get` when localStorage value is invalid or doesn't exist.                                                                   |
| yupSchema?        | Schema<T>             | --      | Yup schema used to validate values being set and read from localStorage.                                                                             |
| validate?         | (value: T) => boolean | --      | Function used to validate values being set and read from localStorage. Valid values should return true.                                              |
| skipRegistration? | boolean               | false   | By default, keys are registered to the schema to prevent the same key from having multiple accessors. To allow multiple accessors per key, pass true |
| marshal?          | (value: T) => string  | --      | Function used to convert value into a string for localStorage.                                                                                       |
| unmarshal?        | (local: string) => T  | --      | Function used to convert the localStorage string into the returned value.                                                                            |

### Type Accessor

```javascript
schema.string(options);
```

_Same as Accessor options, except without `marshal` and `unmarshal` since that is handled by the specified type._
