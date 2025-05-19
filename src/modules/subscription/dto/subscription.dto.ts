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

  static fromStripe(subscription: any) {
    const instance = new SubscriptionDto();
    instance.id = subscription.id;
    instance.name = subscription.name;
    instance.price = subscription.default_price?.unit_amount;
    return instance;
  }
}
