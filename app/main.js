const app = require('./server/apiServer');
// const { getServerPort } = require('./config/settings');

// const PORT = getServerPort();

// app.listen(PORT, '0.0.0.0', () => {
//     console.log('Welcome To Android Server Dashboard');
//     console.log(`Dashboard running on port http://0.0.0.0:${PORT}`);
// });

app.listen(3000, '0.0.0.0', () => {
    console.log('Welcome To Android Server Dashboard');
    console.log(`Dashboard running on port http://0.0.0.0:3000`);
});