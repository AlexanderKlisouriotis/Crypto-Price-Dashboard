import PriceTicker from '@/components/PriceTicker';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Crypto Price Streamer</title>
        <meta name="description" content="Real-time cryptocurrency price streaming" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="./public/favicon.ico" />
      </Head>
      <main>
        <PriceTicker />
      </main>
    </>
  );
}