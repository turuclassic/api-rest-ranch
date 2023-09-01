const Publication = require("../models/publication");
const path = require("path");
const fs = require("fs");

// Importar servicios
const followService = require("../services/followService");

const save = async (req, res) => {
    const params = req.body;

    if (!params.text) {
        return res.status(400).send({
            status: "error",
            message: "Debes enviar un texto"
        });
    }

    let newPublication = new Publication(params);
    newPublication.user = req.user.id;

    try {

        const publicationStored = await newPublication.save();

        return res.status(200).json({
            status: "success",
            message: "Publicacion guardada",
            publicationStored
        });

    } catch (error) {
        console.log(error);
    }
}

const detail = (req, res) => {
    const publicationId = req.params.id;

    Publication.findById(publicationId).then(publicationStored => {
        if (!publicationStored) {
            return res.status(404).send({
                status: "error",
                message: "Ls publicacion no existe"
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Mostrar publicacion",
            publication: publicationStored
        })
    });
}

const remove = (req, res) => {
    const publicationId = req.params.id;

    Publication.findOneAndDelete({ "user": req.user.id, "_id": publicationId })
        .then(error => {
            if (error) {
                return res.status(500).send({
                    status: "error",
                    message: "No se ha podido eliminar la publicacion"
                });
            }

            return res.status(200).json({
                status: "success",
                message: "Publicacion eliminada",
                publication: publicationId
            })
        });
}

const user = async (req, res) => {

    const userId = req.params.id;

    let page = 1

    if (req.params.page) page = req.params.page;

    const itemsPerPage = 5;

    const total = await Publication.countDocuments({ "user": userId });

    Publication.find({ "user": userId })
        .sort("-created_at")
        .populate("user", "-password -__v -role -email")
        .paginate(page, itemsPerPage)
        .then(publications => {

            if (!publications || publications.length <= 0) {
                return res.status(404).send({
                    status: "error",
                    message: "No hay publicationes para mostrar"
                });
            }

            return res.status(200).send({
                status: "success",
                message: "Publicaciones del perfil de un usuario",
                page,
                pages: Math.ceil(total / itemsPerPage),
                total,
                publications
            });
        });
}

const upload = (req, res) => {

    const publicationId = req.params.id;

    if (!req.file) {
        return res.status(400).json({
            status: "error",
            message: "Peticion no incluye la imagen"
        });
    }

    let image = req.file.originalname;

    const imageSplit = image.split("\.");
    const extension = imageSplit[1];

    if (extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif") {

        const filePath = req.file.path;
        const fileDeleted = fs.unlinkSync(filePath);

        return res.status(400).send({
            status: "error",
            message: "Extension de fichero invalida"
        });
    }

    // Guardar imagen en bbdd
    Publication.findOneAndUpdate({ "user": req.user.id, "_id": publicationId }, { file: req.file.filename }, { new: true })
        .then(publicationUpdated => {

            if (!publicationUpdated) {
                return res.status(500).send({
                    status: "error",
                    message: "Error en la subida de la imagen"
                });
            }

            return res.status(200).send({
                status: "success",
                publication: publicationUpdated,
                file: req.file
            })
        })
}

const media = (req, res) => {

    const file = req.params.file;

    // Montar path real de la imagen
    const filePath = "./uploads/publications/" + file;

    // Comprobar que existe
    fs.stat(filePath, (error, exists) => {
        if (error || !exists) {
            return res.status(404).send({
                status: "error",
                message: "No existe la imagen"
            });
        }

        return res.sendFile(path.resolve(filePath));
    })
}

const feed = async(req, res) => {

    let page = 1;

    if(req.params.page) page = req.params.page;

    let itemsPerPage = 5;

    try{
        const myFollows = await followService.followUserIds(req.user.id);


        const total = await Publication.countDocuments({user: myFollows.following})

        // Find a publicaciones in, ordenar, popular y paginar
        const publications = await Publication.find({user: myFollows.following})
                                            .populate("user", "-role -password -__v -email")
                                            .sort("-created_at")
                                            .paginate(page, itemsPerPage);
        

        return res.status(200).json({
            status: "success",
            following: myFollows.following,
            publications,
            total,
            page,
            pages: Math.ceil(total/itemsPerPage)
        });

    } catch(error){

        return res.status(500).send({
            status: "error",
            message: "No se han listado las publicaciones del feed"
        });
    }


}

module.exports = {
    save,
    detail,
    remove,
    user,
    upload,
    media,
    feed

}