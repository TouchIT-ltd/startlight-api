import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${delay}ms`,
        );
        if (body && Object.keys(body).length) {
          this.logger.debug(`Body: ${JSON.stringify(body)}`);
        }
        if (params && Object.keys(params).length) {
          this.logger.debug(`Params: ${JSON.stringify(params)}`);
        }
        if (query && Object.keys(query).length) {
          this.logger.debug(`Query: ${JSON.stringify(query)}`);
        }
      }),
    );
  }
}