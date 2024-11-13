import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error){
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists : userfullname, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar 
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    //return res

    const {email, fullname, age, income, password } = req.body;
    // console.log("email:",email);


    if(
        [email, fullname, age, income, password].some((field)=>field?.trim()=="")
    ){
        throw new ApiError(400,"All fields is required")
    }


    const existedUser= await User.findOne({email})

    if(existedUser){
        throw new ApiError(409, "User with email already exists")

    }
    
    // const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverImagePath=req.files?.coverImage[0]?.path;

    // let coverImagePath;
    // if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
    //     coverImagePath=req.files.coverImage[0].path;
    // }

    // if(!avatarLocalPath){
    //     throw new ApiError(400,"Avatar file is required")
    // }

    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImagePath)

    // if(!avatar){
    //     throw new ApiError(400,"Avatar file is required")
    // }

    const user = await User.create({
        // avatar: avatar.url,
        // coverImage : coverImage?.url || "",
        email,
        fullname,
        age,
        income,
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    console.log("user registered successfully");
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
} )

const loginUser = asyncHandler( async (req,res)=>{
    //req body->data
    // userfullname or email
    //find the user
    //password check
    //access and refresh token
    //send cookie

    const {email, password} = req.body;

    if(!email){
        throw new ApiError(400, "email is required ")
    }
    
    const user =  await User.findOne({email})

    if(!user){
        throw new ApiError(404, "User does not exists");
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
    // await user.save();
    // Update refreshToken in the database
    user.refreshToken = refreshToken;
    const loggedInUser = await user.save();

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure cookies only in production
        sameSite: 'lax',
    }
    console.log("user logged in successfully");
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    // Check if the user already doesn't have a refreshToken (already logged out)
    if (!user.refreshToken) {
        return res.status(200).json(new ApiResponse(200, {}, "User is already logged out"));
    }

    // Remove the refreshToken from the user in the database
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }, // Unset the refreshToken
        },
        { new: true }
    );

    // Cookie options to expire cookies
    const options = {
        httpOnly: true,  // Protect cookie from JS access (helps prevent XSS attacks)
        secure: process.env.NODE_ENV === 'production', // Secure flag for HTTPS (only in production)
        sameSite: 'lax',  // Define SameSite policy for cross-origin requests
        expires: new Date(0),  // Expire the cookie immediately
    };
    console.log("user logged out successfully");
    // Clear the accessToken and refreshToken cookies by setting them with empty values
    return res
        .status(200)
        .cookie("accessToken", "", options)  // Clear the accessToken cookie
        .cookie("refreshToken", "", options) // Clear the refreshToken cookie
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
    );
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request: Missing refresh token");
    }

    try {
        console.log("Received refresh token:", incomingRefreshToken);

        // Verify the refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log("Decoded token:", decodedToken);

        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token: User not found");
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or has already been used");
        }
        console.log(user._id)
        // Generate new access and refresh tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        console.log(accessToken,refreshToken)
        // Save the new refresh token in the database
        user.refreshToken = refreshToken;
        await user.save();  // Save the updated refresh token

        // Set cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',  // Use secure cookies in production only
            sameSite: 'lax',  // Restrict cookies to same-site requests
        };

        // Send new tokens in response
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token or user may be logged out");
    }
});


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
}