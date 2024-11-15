import type { FromSchema } from 'json-schema-to-ts';
import * as schemas from './schemas';
export type CreateChatCompletionBodyParam = FromSchema<typeof schemas.CreateChatCompletion.body>;
export type CreateChatCompletionResponse200 = FromSchema<typeof schemas.CreateChatCompletion.response['200']>;
