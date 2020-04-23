
import { Request, Response } from 'express'
import path from 'path';
import fs from 'fs';
import s3 from '../../middleware/aws';
import ffmpeg from 'ffmpeg'
const { getVideoDurationInSeconds } = require('get-video-duration')

const { MAINconf, AWSconf } = require('../../config/conf.js')
const sequelize = require('../../db/db.js')

interface IUserRequest extends Request {
    user?: any
    cookie?: any
}

const { Video, Comment, Subscriber, LikeSubscriber, DislikeSubscriber } = require('../../models/control.js')

class ActionUserController {

    async addComment(req: IUserRequest, res: Response) {
        try {

            const { comment, video_id } = req.body

            const { name } = req.user

            console.log(req.body);


            if (!comment) return res.status(400).send({ message: 'Не корректные данные' })

            await Comment.create({
                name,
                comment: comment.trim(),
                video_id,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            const items = await Comment.findAll({
                order: [['id', 'DESC']],
                where: {
                    video_id,
                }
            })
            res.json(items)
        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'Что то пошло не так' })
        }
    }

    async removeLikeVideo(req: IUserRequest, res: Response) {
        try {
            const subscriber_id = req.user.id
            const video_id = req.query.video_id

            await LikeSubscriber.destroy({
                where: {
                    video_id,
                    subscriber_id,

                }
            })

            await sequelize.query("UPDATE videos SET `like` = `like` - 1 WHERE id = " + video_id);

            const items = await Video.findAll({
                order: [['id', 'DESC']],
                include: [{
                    model: Subscriber,
                    through: {
                        where: {
                            subscriber_id
                        }
                    },
                    required: true
                }],
            })

            res.json(items)

        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'Что то пошло не так' })
        }
    }

    async addLike(req: IUserRequest, res: Response) {
        try {
            const subscriber_id = req.user.id
            const video_id = req.query.id
            const like = req.query.like
            const dislike = req.query.dislike

            let data: { like: number, dislike: number } = {
                like,
                dislike,
            }

            const itemDis = await DislikeSubscriber.findOne({
                where: {
                    video_id,
                    subscriber_id,
                }
            })

            if (itemDis) {
                await DislikeSubscriber.destroy({
                    where: {
                        video_id,
                        subscriber_id,

                    }
                })
                await Video.update({ dislike: +dislike - 1 }, {
                    where: {
                        id: video_id,
                    }
                })

                data.dislike = +dislike - 1
            }


            const itemLike = await LikeSubscriber.findOne({
                where: {
                    video_id,
                    subscriber_id,
                }
            })

            if (!itemLike) {

                await Video.update({ like: +like + 1 }, {
                    where: {
                        id: video_id,
                    }
                })

                await LikeSubscriber.create({
                    video_id,
                    subscriber_id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })

                data.like = +like + 1

            } else {

                await Video.update({ like: +like - 1 }, {
                    where: {
                        id: video_id,
                    }
                })

                await LikeSubscriber.destroy({
                    where: {
                        video_id,
                        subscriber_id,

                    }
                })

                data.like = +like - 1

            }

            res.json(data)

        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'Что то пошло не так' })
        }
    }

    async addDislike(req: IUserRequest, res: Response) {
        try {
            const subscriber_id = req.user.id
            const video_id = req.query.id
            const like = req.query.like
            const dislike = req.query.dislike

            let data: { like: number, dislike: number } = {
                like,
                dislike,
            }

            const itemLike = await LikeSubscriber.findOne({
                where: {
                    video_id,
                    subscriber_id,
                }
            })

            if (itemLike) {
                await LikeSubscriber.destroy({
                    where: {
                        video_id,
                        subscriber_id,

                    }
                })
                await Video.update({ like: +like - 1 }, {
                    where: {
                        id: video_id,
                    }
                })

                data.like = +like - 1
            }


            const itemDis = await DislikeSubscriber.findOne({
                where: {
                    video_id,
                    subscriber_id,
                }
            })

            if (!itemDis) {

                await Video.update({ dislike: +dislike + 1 }, {
                    where: {
                        id: video_id,
                    }
                })

                await DislikeSubscriber.create({
                    video_id,
                    subscriber_id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })

                data.dislike = +dislike + 1

            } else {

                await Video.update({ dislike: +dislike - 1 }, {
                    where: {
                        id: video_id,
                    }
                })

                await DislikeSubscriber.destroy({
                    where: {
                        video_id,
                        subscriber_id,

                    }
                })
                data.dislike = +dislike - 1
            }

            res.json(data)

        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'Что то пошло не так' })
        }
    }

    //!Перенести в другой класс
    awsParamsFile(staticPath: string, iFile: string, mimetype: string, folderName: string) {
        return new Promise((resolve, reject) => {
            fs.readFile(staticPath, async (err, data) => {
                if (err)
                    return reject(err)
                const params = {
                    Bucket: AWSconf.bucketName + folderName,
                    Key: iFile,
                    Body: data,
                    ContentType: mimetype,
                    ACL: 'public-read',
                }
                resolve(params)
            })
        })
    }
    //!Перенести в другой класс
    deleteFile(filePath: string) {
        return new Promise((reslove, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) return reject(err)
                reslove(true)
            });
        })
    }

    awsDeleteFile(params: any) {
        return new Promise((resolve, reject) => {
            s3.deleteObject(params, function (err: Error, data: any) {
                if (err)
                    return reject(err)
                resolve(data)
            })
        })
    }

    async uploadVideo(req: IUserRequest, res: Response) {

        const filePath = path.join(__dirname, '..', '..', req.file.path)
        const filePathPreview = path.join(__dirname, '..', '..', '/uploads', '/preview', req.file.filename)

        try {
            
            const { name } = req.body

            const duration: number = await getVideoDurationInSeconds(filePath)

            const newDuration = Math.round(duration / 2)

            let videoPreview = await new ffmpeg(filePath);

            await new Promise((resolve, reject) => {
                videoPreview
                    .setVideoStartTime(String(newDuration))
                    .setVideoDuration('3')
                    .save(filePathPreview, (error, file) => {
                        if (error)
                            reject(error)
                        resolve(file)
                    });
            })

            const paramsVideo = await this.awsParamsFile(filePath, req.file.filename, req.file.mimetype, '/video')

            const paramsPreview = await this.awsParamsFile(filePathPreview, req.file.filename, req.file.mimetype, '/video/preview')

            const videoAWS = await s3.upload(paramsVideo).promise()

            const previewAWS = await s3.upload(paramsPreview).promise()

            console.log(previewAWS)

            await Video.create({
                name,
                url: videoAWS.Location,
                fileName: req.file.filename,
                user_id: req.user.id,
                preview: previewAWS.Location,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            res.json('file add')

        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'Что то пошло не так' })
        } finally {
            await this.deleteFile(filePath)
            await this.deleteFile(filePathPreview)
        }

    }

    async removeMyVideo(req: IUserRequest, res: Response) {
        try {
            const user_id = req.user.id

            const video_id = req.query.video_id

            const videoItems = await Video.findOne({
                where: {
                    id: video_id,
                    user_id,
                }
            })

            const paramsVideo = {
                Bucket: AWSconf.bucketName + '/video',
                Key: videoItems.fileName
            };

            const paramsPreview = {
                Bucket: AWSconf.bucketName + '/video/preview',
                Key: videoItems.fileName
            };

            await Comment.destroy({
                where: {
                    video_id,
                }
            })
            await LikeSubscriber.destroy({
                where: {
                    video_id,
                }
            })
            await DislikeSubscriber.destroy({
                where: {
                    video_id,
                }
            })

            await this.awsDeleteFile(paramsVideo)

            await this.awsDeleteFile(paramsPreview)

            await Video.destroy({
                where: {
                    id: video_id,
                    user_id
                }
            })

            const items = await Video.findAll({
                order: [['id', 'DESC']],
                where: {
                    user_id
                }
            })

            res.json(items)
        } catch (err) {
            console.log(err)
            res.status(500).send({ message: 'Что то пошло не так' })
        }
    }
}

export default new ActionUserController





