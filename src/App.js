import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import TestResults from './components/TestResults'; // make sure this path is correct
import { runTulipTests } from './utils/tests';

function App() {
  const [results, setResults] = useState([]);

  const handleParsed = (json) => {
    const testResults = runTulipTests(json);
    setResults(testResults);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Tulip App Analyzer</h1>
      <FileUploader onFileParsed={handleParsed} />
      {results.length > 0 && <TestResults results={results} />}
    </div>
  );
}

export default App;
