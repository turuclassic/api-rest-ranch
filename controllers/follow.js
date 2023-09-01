const follow = require("../models/follow");
const Follow = require("../models/follow");
const User = require("../models/user");
const mongoosePaginate = require("mongoose-pagination");

// Importar servicio
const followService = require("../services/followService");

const save = (req, res) => {

    const params = req.body;

    const identity = req.user;

    let userToFollow = new Follow({
        user: identity.id,
        followed: params.followed
    });

    userToFollow.save().then(followStored => {

        if (!followStored) {
            return res.status(500).json({
                status: "error",
                message: "No se ha podido seguir al usuario"
            });
        }

        return res.status(200).send({
            status: "success",
            message: "Metodo de dar follow",
            identity,
            followStored
        });
    });
}

const unfollow = (req, res) => {
    const userId = req.user.id;

    const followedId = req.params.id;

    Follow.findOneAndRemove({
        "user": userId,
        "followed": followedId
    }).then(followDeleted => {

        if (!followDeleted) {
            return res.status(500).json({
                status: "error",
                message: "No has dejado de seguir a nadie"
            });
        }

        return res.status(200).send({
            status: "success",
            message: "Follow eliminado correctamente",
            identity: req.user,
            followDeleted
        });
    });
}

const following = async (req, res) => {

    let userId = req.user.id;

    if (req.params.id) userId = req.params.id;

    let page = 1;

    if (req.params.page) page = req.params.page;

    let itemsPerPage = 5;

    // Listado de usuarios que sigo y que me siguen
    let total = await Follow.countDocuments({ user: userId });

    Follow.find({ user: userId })
        .populate("user followed", "-password -role -__v -email")
        .paginate(page, itemsPerPage)
        .then(async(follows) => {

            let followUserIds = await followService.followUserIds(req.user.id);

            return res.status(200).send({
                status: "success",
                message: "Listado de usuarios que estoy siguiendo",
                follows,
                total,
                pages: Math.ceil(total / itemsPerPage),
                user_following: followUserIds.following,
                user_follow_me: followUserIds.followers

            });
        });

}

const followers = async(req, res) => {

    let userId = req.user.id;

    if (req.params.id) userId = req.params.id;

    let page = 1;

    if (req.params.page) page = req.params.page;

    let itemsPerPage = 5;

    // Listado de usuarios que sigo y que me siguen
    let total = await Follow.countDocuments({ user: userId });

    Follow.find({ followed: userId })
        .populate("user", "-password -role -__v -email")
        .paginate(page, itemsPerPage)
        .then(async(follows) => {

            let followUserIds = await followService.followUserIds(req.user.id);

            return res.status(200).send({
                status: "success",
                message: "Listado de usuarios que me siguen",
                follows,
                total,
                pages: Math.ceil(total / itemsPerPage),
                user_following: followUserIds.following,
                user_follow_me: followUserIds.followers

            });
        });
}

module.exports = {
    save,
    unfollow,
    following,
    followers
}