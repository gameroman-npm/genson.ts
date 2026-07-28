# genson.ts

**genson.ts** is a user-friendly **JSON Schema** generator built in TypeScript/JavaScript.

genson.ts's core function is to take JSON objects and generate schemas that describe them, with an ability to **merge** schemas.

## Usage

### Creating schemas

To infer a schema from existing object:

```ts
import { createSchema } from "genson.ts";

const schema = createSchema({
  userName: "smith",
  languages: ["c++", "java"],
  age: 40,
});
```

The following schema will be created:

```js
{
  type: "object",
  properties: {
    userName: {
      type: "string",
    },
    languages: {
      type: "array",
      items: {
        type: "string",
      },
    },
    age: {
      type: "integer",
    },
  },
  required: ["userName", "languages", "age"],
};
```

### Merging schemas

You can merge 2 or more schemas, so that merged schema would be kind of a superset of the schemas that it was built from:

```ts
import { mergeSchemas } from "genson.ts";

const merged = mergeSchemas([
  { type: ValueType.Number },
  { type: ValueType.String },
]);

// will create merged schema like this:
// { type: ['number', 'string'] }
```

### Create compound schema

Shorthand for createSchema + mergeSchemas.  
Can take multiple inputs and create one compound schema:

```ts
import { createCompoundSchema } from "genson.ts";

const schema = createCompoundSchema([
  { age: 19, name: "John" },
  { age: 23, admin: true },
  { age: 35 },
]);

// Will create the following schema:
// {
//   type: 'object',
//   properties: { admin: { type: 'boolean' }, age: { type: 'integer' }, name: { type: 'string' } },
//   required: ['age']
// }
```

### Extending schemas

You can extend existing schema to match some value:

```ts
import { extendSchema } from "genson.ts";

const extended = extendSchema({ type: ValueType.Number }, "some string");

// will create extended schema like this:
// { type: ['number', 'string'] }
```

### Comparing schemas

You can compare 2 schemas for equality like this:

```ts
import { areSchemasEqual } from "genson.ts";

areSchemasEqual({ type: ValueType.Number }, { type: ValueType.Number });
// will return true
```

### Subset

You can also check if one schema is a subset of another one like so:

```ts
import { isSubset } from "genson.ts";

isSubset(
  {
    type: ValueType.Array,
    items: { type: [ValueType.Boolean, ValueType.Integer] },
  },
  { type: ValueType.Array, items: { type: [ValueType.Boolean] } },
);
// will return true
```
