import PriceTicker from '@/components/PriceTicker';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>CryptoPrice - Live Prices</title>
        <meta name="description" content="Unlimited live cryptocurrency prices." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <PriceTicker />
      </main>
    </>
  );
}
