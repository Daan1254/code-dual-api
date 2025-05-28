import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SubscriptionDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  price: number;

  @ApiProperty()
  @Expose()
  priceId: string;

  @ApiProperty({
    enum: [
      'active',
      'available',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'paused',
      'trialing',
      'unpaid',
    ],
  })
  @Expose()
  status:
    | 'active'
    | 'available'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'past_due'
    | 'paused'
    | 'trialing'
    | 'unpaid';

  static fromStripe(subscription: any) {
    const instance = new SubscriptionDto();
    instance.id = subscription.id;
    instance.name = subscription.name;
    instance.price = subscription.default_price?.unit_amount;
    instance.priceId = subscription.default_price?.id;
    return instance;
  }
}
