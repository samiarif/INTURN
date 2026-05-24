import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Inturn — the internship platform for Tunisia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
        }}
      >
        <div>Inturn</div>
        <div style={{ fontSize: 28, marginTop: 16, opacity: 0.9 }}>
          The internship platform for Tunisia
        </div>
      </div>
    ),
    { ...size },
  );
}
