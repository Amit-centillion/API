const otpGenerator = () => {
	return Math.floor(Math.random() * 1000000000);
};

export default otpGenerator;