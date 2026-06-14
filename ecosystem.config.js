module.exports = {
  apps: [
    {
      name: 'shipzi-nextjs',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './frontend',
      env: { PORT: 3000, NODE_ENV: 'production' }
    },
    {
      name: 'shipzi-ml',
      script: 'python',
      args: 'ml_bridge/ml_bridge.py',
      cwd: './backend',
      env: { PYTHONPATH: '.', PORT: 5001 }
    },
    {
      name: 'shipzi-backend',
      script: 'node',
      args: 'dist/index.js',
      cwd: './backend',
      env: { PORT: 8080, NODE_ENV: 'production' }
    }
  ]
}
