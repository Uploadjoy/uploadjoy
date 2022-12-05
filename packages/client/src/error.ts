export class OperationError extends Error {
  public readonly statusCode: number;
  public readonly body: any | undefined;

  constructor(statusCode: number, body: any | undefined) {
    super(`HTTP Error Response: ${statusCode}`);
    this.statusCode = statusCode;
    this.body = body;
  }

  /**
   * Get Error Info as JSON
   */
  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.body && this.body.error ? this.body.error : undefined,
      body: this.body,
    };
  }
}
