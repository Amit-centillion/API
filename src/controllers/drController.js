import { drModel, customerModel } from '../models';
import { CONSTANTS } from '../constants';
import {
	errorLogger,
	otpGenerator,
	SendEmail,
	jwtGenerate,
	hashPassword,
} from '../utils';
import { drService, CustomerService } from '../mongoServices';
import jwt_decode from 'jwt-decode';
const {
	RESPONSE_MESSAGE: { DR_USER, FAILED_RESPONSE, CUSTOMER_MESSAGE },
	STATUS_CODE: { SUCCESS, FAILED },
	USER_TYPE: { CUSTOMER },
} = CONSTANTS;

require('dotenv').config({ path: '.env' });
const createDr = async (req, res) => {
	try {
		const createOtp = otpGenerator();
		const { email, type, name } = req.body;
		const { hashedPassword, salt } = await hashPassword(process.env.PASS);

		const insertObj = {
			...req.body,
			otp: createOtp,
			password: hashedPassword,
			salt: salt,
		};

		if (type === CUSTOMER) {
			const findCustomer = await customerModel.findOne({ email });
			if (findCustomer !== null) {
				await customerModel.findOneAndUpdate(
					{ email },
					{ $set: { otp: createOtp } },
				);
				await SendEmail.sendRegisterEmail(email, createOtp, name);
				return res.status(SUCCESS).send({
					success: true,
					msg: CUSTOMER_MESSAGE.VERIFY_OTP,
					data: [],
					createOtp,
				});
			} else {
				const customer = new customerModel(insertObj);
				const saveCustomer = await customer.save();
				if (saveCustomer) {
					await SendEmail.sendRegisterEmail(email, createOtp, name);
					return res.status(SUCCESS).send({
						success: true,
						msg: CUSTOMER_MESSAGE.VERIFY_OTP,
						data: [],
						otp: createOtp,
					});
				} else {
					throw new Error(CUSTOMER_MESSAGE.CREATE_FAILED);
				}
			}
		} else {
			const findDr = await drModel.findOne({ email });
			if (!findDr) {
				const saveDr = new drModel(insertObj);
				const saveResponse = await saveDr.save();

				if (saveResponse) {
					await SendEmail.sendRegisterEmail(
						insertObj.email,
						createOtp,
						saveResponse.name,
					);
					return res.status(SUCCESS).send({
						success: true,
						msg: DR_USER.VERIFY_OTP,
						data: [],
						createOtp,
					});
				} else {
					throw new Error(DR_USER.CREATE_FAILED);
				}
			} else {
				await SendEmail.sendRegisterEmail(
					insertObj.email,
					createOtp,
					findDr.name,
				);
				return res.status(SUCCESS).send({
					success: true,
					msg: DR_USER.VERIFY_OTP,
					data: [],
					createOtp,
				});
			}
		}
	} catch (error) {
		if (error.code === 11000) {
			error.message = DR_USER.ALREADY_AVAILABLE;
		}
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const verifyOtp = async (req, res) => {
	try {
		const { otp, email, type } = req.body;

		if (type === CUSTOMER) {
			let filter = { email, otp: Number(otp) },
				update = { otp: null, isEnabled: true },
				projection = {};

			const findAndVerify = await CustomerService.updateOneQuery(
				filter,
				update,
				projection,
			);

			if (findAndVerify) {
				let token = jwtGenerate(findAndVerify._id, type);
				return res.status(SUCCESS).send({
					success: true,
					msg: CUSTOMER_MESSAGE.VERIFY_SUCCESS,
					data: { token, type },
				});
			} else {
				throw new Error(CUSTOMER_MESSAGE.VERIFY_FAILED);
			}
		} else {
			const findDr = await drModel.findOne({ email });
			if (findDr) {
				if (findDr.otp === otp) {
					await drModel.findOneAndUpdate(
						{ email },
						{ $set: { isEnabled: true } },
						{ new: true },
					);
					let token = jwtGenerate(findDr._id, type);
					return res.status(SUCCESS).send({
						success: true,
						msg: DR_USER.VERIFY_SUCCESS,
						data: { token, type },
					});
				} else {
					throw new Error(DR_USER.VERIFY_FAILED);
				}
			} else {
				throw new Error(DR_USER.VERIFY_FAILED);
			}
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const updateProfile = async (req, res) => {
	try {
		const { id } = req.params;
		const { mainStream, specialization, designation } = req.body;
		let filter = { _id: id },
			updateData = {
				mainStream,
				specialization,
				designation,
				isFirstTime: false,
			};
		const updateDr = await drService.updateDr(filter, updateData);

		if (updateDr) {
			return res.status(SUCCESS).send({
				success: true,
				msg: DR_USER.UPDATE_SUCCESS,
				data: [],
			});
		} else {
			throw new Error(DR_USER.UPDATE_FAILED);
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const deleteDr = async (req, res) => {
	try {
		const { id } = req.params;
		let filter = { _id: id },
			updateData = {
				isEnabledL: false,
				deletedAt: new Date(),
				deletedBy: req.cu,
			};
		const deleteDR = await drService.updateOneQuery(filter, updateData);

		if (deleteDR) {
			return res.status(SUCCESS).send({
				success: true,
				msg: DR_USER.DELETE_SUCCESS,
				data: [],
			});
		} else {
			throw new Error(DR_USER.DELETE_FAILED);
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const listDr = async (req, res) => {
	try {
		const { data, totalCount } = await drService.findAllQuery(req.query);
		if (data) {
			return res.status(SUCCESS).send({
				success: true,
				msg: DR_USER.GET_SUCCESS,
				data,
				totalCount,
			});
		} else {
			throw new Error(DR_USER.GET_FAILED);
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const ListCustomer = async (req, res) => {
	try {
		const { data, totalCount } = await CustomerService.findAllQuery(req.query);
		if (data) {
			return res.status(SUCCESS).send({
				success: true,
				msg: CUSTOMER_MESSAGE.GET_SUCCESS,
				data,
				totalCount,
			});
		} else {
			throw new Error(CUSTOMER_MESSAGE.GET_FAILED);
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const updateCustomer = async (req, res) => {
	try {
		const { id } = req.params;

		let filter = { _id: id },
			updateData = {
				...req.body,
				isFirstTime: false,
			};
		const updateCustomerData = await CustomerService.updateCustomer(
			filter,
			updateData,
		);
		if (updateCustomerData) {
			return res.status(SUCCESS).send({
				success: true,
				msg: CUSTOMER_MESSAGE.UPDATE_SUCCESS,
				data: [],
			});
		} else {
			throw new Error(CUSTOMER_MESSAGE.UPDATE_FAILED);
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const deleteCustomer = async (req, res) => {
	try {
		const { id } = req.params;
		let filter = { _id: id },
			updateData = {
				isEnabledL: false,
				deletedAt: new Date(),
				deletedBy: req.currentUser._Id,
			};
		const deleteCustomerData = await CustomerService.updateCustomer(
			filter,
			updateData,
		);
		if (deleteCustomerData) {
			return res.status(SUCCESS).send({
				success: true,
				msg: CUSTOMER_MESSAGE.DELETE_SUCCESS,
				data: [],
			});
		} else {
			throw new Error(CUSTOMER_MESSAGE.DELETE_FAILED);
		}
	} catch (error) {
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
const socialLogin = async (req, res) => {
	try {
		let { token, type } = req.body;
		let decodedToken = jwt_decode(token);
		let { email } = decodedToken;
		if (type === CONSTANTS.USER_TYPE.CUSTOMER) {
			let { data: customer } = await CustomerService.findAllQuery({ email });
			if (customer.length === 1) {
				let tokenData = jwtGenerate(customer[0]._id, type);
				return res.status(SUCCESS).send({
					success: true,
					msg: CUSTOMER_MESSAGE.CREATE_SUCCESS,
					data: customer[0],
					token: tokenData,
				});
			} else {
				const { hashedPassword, salt } = await hashPassword(process.env.PASS);
				let payload = {
					email: decodedToken.email,
					name: decodedToken.name,
					loginType: 'SOCIAL',
					isEnabled: true,
					password: hashedPassword,
					salt: salt,
				};
				let saveData = new customerModel(payload);
				let data = await saveData.save();
				let tokenData = jwtGenerate(data._id, type);
				return res.status(SUCCESS).send({
					success: true,
					msg: CUSTOMER_MESSAGE.CREATE_SUCCESS,
					data,
					token: tokenData,
				});
			}
		} else {
			let { data: drFind } = await drService.findAllQuery({ email });
			if (drFind.length === 1) {
				let tokenData = jwtGenerate(drFind[0]._id, type);
				return res.status(SUCCESS).send({
					success: true,
					msg: CUSTOMER_MESSAGE.CREATE_SUCCESS,
					data: drFind[0],
					token: tokenData,
				});
			} else {
				const { hashedPassword, salt } = await hashPassword(process.env.PASS);
				let payload = {
					email: decodedToken.email,
					name: decodedToken.name,
					loginType: 'SOCIAL',
					isEnabled: true,
					password: hashedPassword,
					salt: salt,
				};
				let saveData = new drModel(payload);
				let data = await saveData.save();
				let tokenData = jwtGenerate(data._id, type);
				return res.status(SUCCESS).send({
					success: true,
					msg: DR_USER.CREATE_SUCCESS,
					data,
					token: tokenData,
				});
			}
		}
	} catch (error) {
		console.log('error', error);
		errorLogger(error.message, req.originalUrl, req.ip);
		return res.status(FAILED).json({
			success: false,
			error: error.message || FAILED_RESPONSE,
		});
	}
};
export default {
	createDr,
	verifyOtp,
	updateProfile,
	deleteDr,
	listDr,
	ListCustomer,
	updateCustomer,
	deleteCustomer,
	socialLogin,
};
