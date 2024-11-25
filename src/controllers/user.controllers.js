import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"

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
     const existedUser = User.findOne({
        $or:[{ username }, { email }]
     })

     if (existedUser) {
        throw new ApiError(409, "username or password already exists")
     }

    //  ***************check for images ******************
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
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



export { registerUser }
