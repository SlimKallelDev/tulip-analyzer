import React from 'react';

const TestResults = ({ results }) => {
  return (
    <div>
      <h2>Test Results</h2>
      {results.map((res, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #ccc',
            marginBottom: '1rem',
            padding: '1rem',
            background: res.status === 'Pass' ? '#e0ffe0' : '#ffe0e0',
          }}
        >
          <strong>{res.name}:</strong> {res.status}
          {res.details && res.details.length > 0 && (
            <ul>
              {res.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default TestResults;
