module.exports = {
  apps: [
    {
      name: 'shipzi-nextjs',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: { PORT: 3000, NODE_ENV: 'production' }
    },
    {
      name: 'shipzi-ml',
      script: 'gunicorn',
      args: 'ml_bridge:app --workers 2 --bind 0.0.0.0:5001 --timeout 120',
      interpreter: 'python3',
      cwd: './backend/ml_bridge',
      env: { PYTHONPATH: '.' }
    },
    {
      name: 'shipzi-backend',
      script: 'dist/index.js',
      cwd: './backend',
      env: { PORT: 8080, NODE_ENV: 'production' }
    }
  ]
}
