# LocalStorage Schema

LocalStorage Schema solves three main problems:

- Validate localStorage values against a schema, or using a custom validation function.
- Set default values to prevent receiving null values.
- Prevent designating the same key twice.

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

## Adding validations

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

## Adding default values

Default values are returned when the value being retrieved is null or fails validation. Default values must pass validation.

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

## Schema accessor types

The schema supports several build in accessor types.

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

Custom accessor types can be created, allowing for custom marshaling.

```javascript
schema.accessor({
  key: 'greeting',
  marshal: item => item.toString(), // item will be marshaled into string form for localStorage
  unmarshal: string => new Item(string), // string will be unmarshaled back into an Item
});
```
