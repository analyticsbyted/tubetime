import '../src/index.css';
import Providers from '../src/components/Providers';

export const metadata = {
  title: 'TubeTime',
  description: 'Historical YouTube search engine for video transcription pipeline',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

