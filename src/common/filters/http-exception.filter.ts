import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      const message = (res as any).message || exception.message
      response.status(status).json({ success: false, error: { statusCode: status, message } })
    } else {
      const status = HttpStatus.INTERNAL_SERVER_ERROR
      response.status(status).json({ success: false, error: { statusCode: status, message: exception.message || 'Internal server error' } })
    }
  }
}
