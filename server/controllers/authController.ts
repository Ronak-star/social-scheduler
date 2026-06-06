import { Request, Response } from "express";
import { User } from "../models/User.js";
import bcrypt from 'bcrypt'


// Register User
// POST /api/auth/register

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({
        message: "User already exists",
      });
      return;
    }

  
  } catch (error) {
   
  }
};