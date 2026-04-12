
import { ExecutionContext, HttpException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export default class Throttler extends ThrottlerGuard {
	protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
		throw new HttpException("Too many requests, please try again later.", 429);
	}
}