// Representative sample JSON document and matching JSON Schema for the
// "Load sample" actions. Tool-specific.

export const SAMPLE_JSON = `{
  "id": 1042,
  "name": "Ada Lovelace",
  "active": true,
  "roles": ["admin", "editor"],
  "profile": {
    "age": 36,
    "email": "ada@example.com"
  },
  "scores": [98.5, 87, 100]
}
`;

export const SAMPLE_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "name", "active"],
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string", "minLength": 1 },
    "active": { "type": "boolean" },
    "roles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "profile": {
      "type": "object",
      "properties": {
        "age": { "type": "integer", "minimum": 0 },
        "email": { "type": "string", "format": "email" }
      }
    },
    "scores": {
      "type": "array",
      "items": { "type": "number" }
    }
  },
  "additionalProperties": true
}
`;
