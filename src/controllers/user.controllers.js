import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

// function to generate access and refresh token || jab bhi refresh and access token expire ho jayenge to isse new genareate ho jayenge call karne par
const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

// user register logic 
const registerUser = asyncHandler(async(req, res)=>{
    // get user details from frontend 
    // validation - not empty
    // check if user already exists : by username , or email
    // check for images, check for avatar
    // upload them to cloudinary
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // **************** get user details **********************

    const {fullName, email, password, username} = req.body
    
    // ************* validation code *************************

    // for this type of validation we need to check one by one for each fields so we are using another method
    // if (fullName === "") {
    //     throw new ApiError(400, "fullname is required !")  
    // }
    
    if (
        [fullName, email, password, username].some((field)=>{
            field?.trim()===""
        })
    ) {
        throw new ApiError(400, "All fields are required!")
    }

    // ************ check if user already exists ***************
     const existedUser = await User.findOne({
        $or:[{ username }, { email }]
     })

     if (existedUser) {
        throw new ApiError(409, "username or password already exists")
     }
    //  console.log(req.files);
    //  ***************check for images ******************
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    //*********** */ check for avatar ***********************************
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required!")
    }

    // ****************upload on cloudinary **********************
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required!")
    }

    // create user 

   const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()

    })
    
    // ********* remove password and refreshToken**********
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //  **************** check for user creation***********
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while creating the user")
    }

    // return res

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registred successfully ")
    )


})

// user login logic
const loginUser = asyncHandler(async(req,res)=>{
    // req body and get data
    // username or email
    // find user
    // password check
    // access and refresh token
    // send cookies
    const {username, email, password} = req.body

    
    // username or email?
    // if(!(username || email)){
    //     throw new ApiError(400, "username or email is required")
    // }
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    // find user in database
    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // check password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // access and refresh token
    const {accessToken, refreshToken}=await generateAccessAndRefreshToken(user._id)

    // send cookie  
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //  jab bhi cookie send ki jati hai to use koi bhi frontend par modify kar sakta hai uske liye httpOnly and secure only true kar diya jata hai jisse yah only server se hi modify kiya ja sake
    const options = {
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },
        "User loggedIn Successfully"
        )
    )
})

// logout User
const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "", "User logged Out"))
})

// refresh and access token new generation or refresh 
const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unathorized request")
    }

    try {
        const decodedtoken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedtoken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        // compare the incomingrefreshtoken and saved refershtoken in database
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken, newRefreshToken}=await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken, refreshToken:newRefreshToken},
                "Access token refreshed Successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})



export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken

 }
