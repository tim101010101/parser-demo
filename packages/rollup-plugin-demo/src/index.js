import { add } from './add';
import { mul } from './mul';

console.log(`1 + 2 * 3 = ${add(1, mul(2, 3))}`);

export { add, mul };
