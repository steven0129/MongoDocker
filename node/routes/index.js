const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const Schema = mongoose.Schema

const conn = mongoose.createConnection('mongodb://mongoadmin:mongoadmin@127.0.0.1:27017/pq-dump-v1?authSource=admin', { 
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const CroppedImg = new Schema({
  name: String,
  label: String,
  file_id: String
}, {
  collection: 'CroppedImg'
})

const OriginImg = new Schema({
  name: String,
  label: String,
  file_id: String
}, {
  collection: 'OriginImg'
})

const Info = new Schema({
  FileName: String,
  Label: String,
  OriginVideo: String,
  OriginImg: String
}, {
  collection: 'info'
})

const Report = new Schema({
  FileName: String,
  OriginName: String,
  Set: String,
  Label: String,
  Predicted: String
}, {
  collection: 'report-20191219'
})

Grid.mongo = mongoose.mongo

var gfs = null
conn.once('open', function() {
  gfs = new Grid(conn.db)
})

originModel = conn.model('OriginImg', OriginImg)
croppedModel = conn.model('CroppedImg', CroppedImg)
infoModel = conn.model('Info', Info)
reportModel = conn.model('report', Report)

router.get('/pq-dump-v1', async (req, res, next) => {
  res.render('index')
})

router.get('/lg-pattern-cropped', async (req, res, next) => {
  res.render('lg-pattern-cropped')
})

router.get('/report', async(req, res, next) => {
  res.render('countTRUE')
})

router.get('/detail', async(req, res, next) => {
  res.render('detail')
})

router.get('/origin_img', async(req, res) => {
  let page = req.query.page || 1
  let rows = await originModel.find({}).skip((page - 1) * 10).limit(10)
  res.send(rows)
})

router.get('/cropped_img', async(req, res) => {
  let page = req.query.page || 1
  let rows = await croppedModel.find({}).skip((page - 1) * 10).limit(10)
  res.send(rows)
})

router.get('/origin_img/get', async(req, res) => {
  let name = req.query.name
  let rows = await originModel.find({name: name})
  let stream = await gfs.createReadStream({_id: rows[0].file_id})
  stream.pipe(res)
})

router.get('/cropped_img/get', async(req, res) => {
  let name = req.query.name
  let rows = await croppedModel.find({name: name}).limit(1)
  let stream = await gfs.createReadStream({_id: rows[0].file_id})
  stream.pipe(res)
})

router.get('/count/true', async(req, res) => {
  let threshold = parseInt(req.query.t) || 192
  let rows = await reportModel.aggregate([
      {
          "$project": {
              "FileName": 1,
              "OriginName": 1,
              "Set": 1,
              "TF": { "$eq": ["$Label", "$Predicted"] }
              }
      },
      {
          "$group": {
              _id: "$OriginName",
              "TRUE": {"$sum": { $cond: [ { $eq: [ "$TF", true ] }, 1, 0 ] }}   
          }
      },
      {
          "$match": {
              "TRUE": { "$lt": threshold }
          }
      },
      {
          "$sort": {
            "TRUE": 1
          }
      }
  ])

  res.send(rows)
})

router.get('/info', async(req, res) => {
  let name = req.query.name
  if(typeof name === 'undefined' || name == '') res.send('Name cannot be empty!!')

  let rows = await reportModel.find({OriginName: name})
  res.send(rows)
})

router.get('/img', async(req, res) => {
  let stream = await gfs.createReadStream({ _id: req.query.id })
  stream.pipe(res)
})

module.exports = router
