import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

function parseDateTime(value: unknown): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new GraphQLError("Invalid DateTime: not a valid date");
    }
    return value;
  }
  if (typeof value !== "string") {
    throw new GraphQLError("Invalid DateTime: expected an ISO-8601 string");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError("Invalid DateTime: not a valid date");
  }
  return date;
}

export const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 date-time string",
  serialize: (value) => parseDateTime(value).toISOString(),
  parseValue: (value) => parseDateTime(value),
  parseLiteral: (ast) => {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError("Invalid DateTime: expected a string literal");
    }
    return parseDateTime(ast.value);
  },
});

export const scalarResolvers = { DateTime: DateTimeScalar };
