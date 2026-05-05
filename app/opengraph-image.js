import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  const fontBold = readFileSync(join(process.cwd(), 'public/fonts/Manrope-Bold.ttf'));
  const fontExtraBold = readFileSync(join(process.cwd(), 'public/fonts/Manrope-ExtraBold.ttf'));
  const fonts = [
    { name: 'Manrope', data: fontBold, weight: 700 },
    { name: 'Manrope', data: fontExtraBold, weight: 800 },
  ];

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      backgroundColor: '#074a34', padding: '72px 80px',
      fontFamily: 'Manrope',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 21, fontWeight: 700, letterSpacing: '0.02em' }}>
          PortfolioDB
        </span>
      </div>

      {/* Main content — bottom-aligned */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
        <span style={{
          color: '#ffffff', fontSize: 72, fontWeight: 800,
          lineHeight: 1.05, letterSpacing: '-0.02em',
        }}>
          Portfolio Performance Database
        </span>

        <span style={{
          color: 'rgba(255,255,255,0.65)', fontSize: 26, fontWeight: 700, marginTop: 24,
        }}>
          Compare 70+ portfolios by CAGR, Sharpe ratio, max drawdown, and more. Free.
        </span>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
          {['Buy and Hold', 'Tactical', 'Robo-Advisor'].map((label) => (
            <span key={label} style={{
              color: '#074a34', backgroundColor: 'rgba(255,255,255,0.88)',
              padding: '7px 18px', borderRadius: 20,
              fontSize: 17, fontWeight: 700,
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>,
    { ...size, fonts }
  );
}
