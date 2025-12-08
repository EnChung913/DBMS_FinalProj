import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context) {
    console.log('JwtAuthGuard err =', err);
    console.log('JwtAuthGuard info =', info);
    console.log('JWT secret used by Strategy:', process.env.JWT_SECRET);

    return super.handleRequest(err, user, info, context);
  }
}
