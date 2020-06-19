const express = require('express')
const fs = require('fs')

const router = express.Router()

// 경로 가져오기 (인증 필요없음)
router.get('/route/:num', (req, res) => {
  console.log('[API] GET /api/route/' + req.params.num)
  var data = getData().route.find((val) => val.num === req.params.num)
  if(data == null) res.sendStatus(404)
  else res.send(data)
})

// 새 경로 추가
router.post('/route', (req, res) => {
  if(!req.session.adminLogin) {
    res.sendStatus(401)
    return
  }

  console.log('[API] POST /api/route')

  var newData = req.body
  var data = getData()

  newData.num = getNextNum(data.route) + ''
  data.route.push(newData)
  var day = calcDays(data.route)

  saveData(data)
  res.send(newData)
})

// 기존 경로 수정
router.patch('/route/:num', (req, res) => {
  if(!req.session.adminLogin) {
    res.sendStatus(401)
    return
  }

  console.log('[API] PATCH /api/route/' + req.params.num)
  var newData = req.body
  var data = getData()
  var idx = data.route.findIndex((val) => val.num == newData.num)

  if(idx == -1) {
    res.sendStatus(404)
    return
  }

  data.route[idx] = newData
  saveData(data)
  res.send(newData)
})

// 기존 경로 삭제
router.delete('/route/:num', (req, res) => {
  if(!req.session.adminLogin) {
    res.sendStatus(401)
    return
  }

  console.log('[API] DELETE /api/route/' + req.params.num)
  var data = getData()
  var idx = data.route.findIndex((val) => val.num == req.params.num)

  if(idx == -1) {
    res.sendStatus(404)
    return
  }
  
  data.route.splice(idx, 1)
  saveData(data)
  res.send({})
})

function getData() {
  return JSON.parse(fs.readFileSync('./static/data/data.json').toString())
}

function saveData(data) {
  fs.writeFileSync('./static/data/data.json', JSON.stringify(data, null, 2))
}

function getNextNum(dataArr) {
  var i = 0
  dataArr.forEach((val) => {
    if(parseInt(val.num) > i) i = val.num
  })
  return parseInt(i) + 1
}

function calcDays(arr) {
  var yn = 0, mn = 0, dn = 0, yo = 0, mo = 0, _do = 0
  arr.forEach((val) => {
    var sp = val.date.split('.')
    var yy = parseInt(sp[0]),
      mm = parseInt(sp[1]),
      dd = parseInt(sp[2])
    if(yy > yn) {
      yn = yy, mn = mm, dn = dd
    } else if(mm > mn) {
      mn = mm, dn = dd
    } else if(dd > dn) dn = dd

    if(yy < yo) {
      yo = yy, mo = mm, _do = dd
    } else if(mm < mo) {
      mo = mm, _do = dd
    } else if(dd < _do) _do = dd
  })

  var lastDay = {
    year: yn,
    month: mn,
    day: dn
  }

  var firstDay = {
    year: yo,
    month: mo,
    day: _do
  }

  return {firstDay, lastDay}
}

module.exports = router
