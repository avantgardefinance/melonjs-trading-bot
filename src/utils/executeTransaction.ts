import { Transaction } from "@melonproject/melonjs";

export function executeTransaction(transaction: Transaction, options: any) {
  return new Promise(async (resolve, reject) => {
    try {
      await transaction.validate();
      const opts = await transaction.prepare(options);
      const tx = transaction.send(opts);
      tx.once('transactionHash', (hash) => console.log(`Pending: ${hash}`));
      tx.once('receipt', (receipt) => resolve(receipt));
      tx.once('error', (error) => reject(error));
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}