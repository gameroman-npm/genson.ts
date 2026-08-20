export const ValueType = {
  Null: "null",
  Boolean: "boolean",
  Integer: "integer",
  Number: "number",
  String: "string",
  Object: "object",
  Array: "array",
} as const;

export type ValueType = (typeof ValueType)[keyof typeof ValueType];

export type SchemaType = ValueType | ValueType[];

export type Schema = {
  type?: SchemaType;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  anyOf?: Array<Schema>;
};

export type ArraySchema = { type?: SchemaType; items?: Schema };

export type ObjectSchema = {
  type?: SchemaType;
  properties?: Record<string, Schema>;
  required?: string[];
};

export type ContainerSchema = ArraySchema | ObjectSchema;

export type AnyOfSchema = { anyOf: Array<Schema> };

export type SimpleSchema = { type: SchemaType };

export type SchemaGenOptions = {
  noRequired: boolean;
};

export type SchemaComparisonOptions = {
  ignoreRequired: boolean;
};
