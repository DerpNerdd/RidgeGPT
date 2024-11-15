declare const CreateChatCompletion: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly model: {
                readonly type: "string";
                readonly description: "The model ID to use for the completion.";
                readonly default: "chai_v1";
            };
            readonly messages: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly role: {
                            readonly type: "string";
                            readonly enum: readonly ["user", "ai"];
                            readonly description: "Role of the message sender.";
                        };
                        readonly content: {
                            readonly type: "string";
                            readonly description: "Content of the message.";
                        };
                    };
                };
            };
            readonly max_tokens: {
                readonly type: "integer";
                readonly description: "The maximum number of tokens to generate.";
            };
            readonly temperature: {
                readonly type: "number";
                readonly description: "Sampling temperature between 0 and 1.";
            };
        };
        readonly required: readonly ["model", "messages"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly id: {
                    readonly type: "string";
                    readonly description: "The ID of the chat completion.";
                };
                readonly object: {
                    readonly type: "string";
                    readonly description: "The object type.";
                };
                readonly created: {
                    readonly type: "integer";
                    readonly description: "Timestamp of when the chat completion was created.";
                };
                readonly model: {
                    readonly type: "string";
                    readonly description: "The model used for the completion.";
                };
                readonly choices: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly index: {
                                readonly type: "integer";
                                readonly description: "The choice index.";
                            };
                            readonly message: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly role: {
                                        readonly type: "string";
                                    };
                                    readonly content: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly finish_reason: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly usage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly prompt_tokens: {
                            readonly type: "integer";
                        };
                        readonly completion_tokens: {
                            readonly type: "integer";
                        };
                        readonly total_tokens: {
                            readonly type: "integer";
                        };
                    };
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
export { CreateChatCompletion };
