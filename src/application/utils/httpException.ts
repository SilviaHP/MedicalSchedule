export class HttpException extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    //captura la pila de llamada de la excepcion
    Error.captureStackTrace(this, this.constructor);
  }
}
