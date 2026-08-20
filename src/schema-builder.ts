import type {
  ValueType,
  AnyOfSchema,
  Schema,
  SchemaGenOptions,
  SimpleSchema,
  ObjectSchema,
  ArraySchema,
  ContainerSchema,
} from "./types";

function createSchemaFor(
  value: unknown,
  options?: SchemaGenOptions,
): Schema | undefined {
  switch (typeof value) {
    case "number":
      if (Number.isInteger(value)) {
        return { type: "integer" };
      }
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "string":
      return { type: "string" };
    case "object":
      if (value === null) {
        return { type: "null" };
      }
      if (Array.isArray(value)) {
        return createSchemaForArray(value, options);
      }
      return createSchemaForObject(value, options);
  }
}

function createSchemaForArray(
  arr: unknown[],
  options?: SchemaGenOptions,
): ArraySchema {
  if (!arr.length) return { type: "array" };
  const elementSchemas = arr.map((value) => createSchemaFor(value, options)!);
  const items = mergeSchemas(elementSchemas);
  return { type: "array", items };
}

function createSchemaForObject(
  obj: {},
  options?: SchemaGenOptions,
): ObjectSchema {
  const keys = Object.keys(obj);
  if (!keys.length) return { type: "object" };

  const properties = Object.entries(obj).reduce<Record<string, Schema>>(
    (props, [key, val]) => {
      props[key] = createSchemaFor(val, options)!;
      return props;
    },
    {},
  );

  const schema: ObjectSchema = { type: "object", properties };
  if (!options?.noRequired) schema.required = keys;
  return schema;
}

type SchemasByType = Record<
  Exclude<ValueType, "object" | "array">,
  Schema[]
> & { array: ArraySchema[]; object: ObjectSchema[] };

export function mergeSchemas(
  schemas: Schema[],
  options?: SchemaGenOptions,
): Schema {
  const schemasByType: SchemasByType = {
    null: [],
    boolean: [],
    integer: [],
    number: [],
    string: [],
    array: [],
    object: [],
  };

  for (const unwrappedSchema of unwrapSchemas(schemas)) {
    const schema = schemasByType[unwrappedSchema.type as ValueType];
    if (!schema.length || isContainerSchema(unwrappedSchema)) {
      schema.push(unwrappedSchema);
    }
  }

  const resultSchemasByType: Record<ValueType, Schema | undefined> = {
    null: schemasByType.null[0],
    boolean: schemasByType.boolean[0],
    number: schemasByType.number[0],
    integer: schemasByType.integer[0],
    string: schemasByType.string[0],
    array: combineArraySchemas(schemasByType.array),
    object: combineObjectSchemas(schemasByType.object, options),
  };

  if (resultSchemasByType.number) {
    // if at least one value is float, others can be floats too
    delete resultSchemasByType.integer;
  }

  const schemasFound = Object.values(resultSchemasByType).filter((s) => !!s);
  if (schemasFound.length > 1) return wrapAnyOfSchema({ anyOf: schemasFound });
  return schemasFound[0]!;
}

function combineArraySchemas(schemas?: ArraySchema[]): ArraySchema | undefined {
  if (!schemas?.length) return;

  const itemSchemas: Schema[] = [];
  for (const schema of schemas) {
    if (!schema.items) continue;
    itemSchemas.push(...unwrapSchema(schema.items));
  }

  if (!itemSchemas.length) return { type: "array" };

  const items = mergeSchemas(itemSchemas);
  return { type: "array", items };
}

function combineObjectSchemas(
  schemas?: ObjectSchema[],
  options?: SchemaGenOptions,
): ObjectSchema | undefined {
  if (!schemas?.length) return;

  const allPropSchemas = schemas.map((s) => s.properties).filter((s) => !!s);
  const schemasByProp: Record<string, Schema[]> = Object.create(null);
  for (const propSchemas of allPropSchemas) {
    for (const [prop, schema] of Object.entries(propSchemas)) {
      (schemasByProp[prop] ??= []).push(...unwrapSchema(schema));
    }
  }

  const properties: Record<string, Schema> = Object.entries(
    schemasByProp,
  ).reduce((props: Record<string, Schema>, [prop, schemas]) => {
    if (schemas.length === 1) {
      props[prop] = schemas[0]!;
    } else {
      props[prop] = mergeSchemas(schemas);
    }
    return props;
  }, {});

  const combinedSchema: ObjectSchema = { type: "object" };

  if (Object.keys(properties).length) {
    combinedSchema.properties = properties;
  }
  if (!options?.noRequired) {
    const required = intersection(schemas.map((s) => s.required || []));
    if (required.length) combinedSchema.required = required;
  }

  return combinedSchema;
}

export function unwrapSchema(schema?: Schema): Schema[] {
  if (!schema) return [];
  if (schema.anyOf) return unwrapSchemas(schema.anyOf);
  if (Array.isArray(schema.type)) {
    return schema.type.map((x) => ({ type: x }));
  }
  return [schema];
}

export function unwrapSchemas(schemas?: Schema[]): Schema[] {
  if (!schemas?.length) return [];
  return schemas.flatMap((schema) => unwrapSchema(schema));
}

export function wrapAnyOfSchema(
  schema: AnyOfSchema,
): AnyOfSchema | SimpleSchema {
  const simpleSchemas: ValueType[] = [];
  const complexSchemas: Schema[] = [];
  for (const subSchema of schema.anyOf) {
    if (Array.isArray(subSchema.type)) {
      simpleSchemas.push(...subSchema.type);
    } else if (isSimpleSchema(subSchema)) {
      simpleSchemas.push(subSchema.type);
    } else {
      complexSchemas.push(subSchema);
    }
  }
  if (!complexSchemas.length) return { type: simpleSchemas };

  const anyOf: Schema[] = [];
  if (simpleSchemas.length) {
    const type = simpleSchemas.length > 1 ? simpleSchemas : simpleSchemas[0]!;
    anyOf.push({ type });
  }
  anyOf.push(...complexSchemas);
  return { anyOf };
}

function intersection(arrays: string[][]): string[] {
  if (!arrays.length) return [];
  const counter: Record<string, number> = {};
  for (const arr of arrays) {
    for (const val of arr) {
      if (!counter[val]) {
        counter[val] = 1;
      } else {
        counter[val]++;
      }
    }
  }

  return Object.entries(counter)
    .filter(([, value]) => value === arrays.length)
    .map(([key]) => key);
}

function isSimpleSchema(schema: Schema): schema is SimpleSchema {
  const keys = Object.keys(schema);
  return keys.length === 1 && keys[0] === "type";
}

function isContainerSchema(schema: Schema): schema is ContainerSchema {
  const type = schema.type;
  return type === "array" || type === "object";
}

export function createSchema(
  value: unknown,
  options?: SchemaGenOptions,
): Schema | undefined {
  if (typeof value === "undefined") value = null;
  const clone = JSON.parse(JSON.stringify(value));
  return createSchemaFor(clone, options);
}

export function extendSchema(
  schema: Schema,
  value: unknown,
  options?: SchemaGenOptions,
): Schema {
  const valueSchema = createSchema(value, options)!;
  return mergeSchemas([schema, valueSchema], options);
}

export function createCompoundSchema(
  values: unknown[],
  options?: SchemaGenOptions,
): Schema {
  const schemas = values.map((value) => createSchema(value, options)!);
  return mergeSchemas(schemas, options);
}
