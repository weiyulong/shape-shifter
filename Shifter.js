'use strict'

let Shifter = {
  init (canvas, config = {}) {
    this.default = config.default || 'test'
    this.Drawing.init(canvas)
    this.Builder.init()
    this.Commands(this.default)
    this.Drawing.loop(function () {
      Shifter.Shape.render()
    })
  }
}

Shifter.Commands = (function () {
  let interval, currentAction, time,
    maxShapeSize = 30,
    sequence = []
  function formatTime (date) {
    var h = date.getHours().toString(),
      m = date.getMinutes().toString(),
      s = date.getSeconds().toString()
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`
  }
  function timedAction (fn, delay, max, reverse) {
    clearInterval(interval)
    currentAction = reverse ? max : 1
    fn(currentAction)
    if (!max || (!reverse && currentAction < max) || (reverse && currentAction > 0)) {
      interval = setInterval(() => {
        currentAction = reverse ? currentAction - 1 : currentAction + 1
        fn(currentAction)
        if ((!reverse && max && currentAction === max) || (reverse && currentAction === 0)) {
          clearInterval(interval)
        }
      }, delay)
    }
  }
  function getAction (command) {
    let action = { name: 'text', value: '' }
    if (command.slice(0, 1) === '#') {
      let temp = command.slice(1)
      if (~temp.indexOf(' ')) {
        let seat = temp.indexOf(' ')
        action.name = temp.slice(0, seat)
        action.value = temp.slice(seat + 1)
      } else {
        action.name = temp
      }
    } else {
      action.value = command
    }
    return action
  }
  function execute (commands) {
    let action, current
    sequence = Array.isArray(commands) ? commands : sequence.concat(commands.split('|'))
    timedAction(() => {
      current = sequence.shift()
      let command = getAction(current)
      let value = ''
      switch (command.name) {
        case 'countdown':
          value = parseInt(command.value, 10) || 10
          value = value > 0 ? value : 10
          timedAction(index => {
            if (index === 0) {
              if (sequence.length === 0) {
                Shifter.Shape.switchShape(Shifter.Builder.letter(''))
              } else {
                execute(sequence)
              }
            } else {
              Shifter.Shape.switchShape(Shifter.Builder.letter(index), true)
            }
          }, 1000, value, true)
          break
        case 'rectangle':
          value = command.value.split('x')
          value = (value && value.length === 2) ? value : [maxShapeSize, maxShapeSize / 2]
          Shifter.Shape.switchShape(Shifter.Builder.rectangle(Math.min(maxShapeSize, parseInt(value[0], 10)), Math.min(maxShapeSize, parseInt(value[1], 10))))
          break
        case 'circle':
          value = parseInt(command.value, 10) || maxShapeSize
          value = Math.min(value, maxShapeSize)
          Shifter.Shape.switchShape(Shifter.Builder.circle(value))
          break
        case 'time':
          let now = formatTime(new Date())
          if (sequence.length > 0) {
            Shifter.Shape.switchShape(Shifter.Builder.letter(now))
          } else {
            timedAction(() => {
              now = formatTime(new Date())
              if (now !== time) {
                time = now
                Shifter.Shape.switchShape(Shifter.Builder.letter(time))
              }
            }, 1000)
          }
          break
        case 'icon':
          Shifter.Builder.imageFile(`ionicons/${command.value}.png`, obj => {
            Shifter.Shape.switchShape(obj)
          })
          break
        case 'image':
          Shifter.Builder.imageFile(command.value, obj => {
            Shifter.Shape.switchShape(obj)
          })
          break
        default:
          Shifter.Shape.switchShape(Shifter.Builder.letter(command.value))
      }
    }, 3000, sequence.length)
  }
  return execute
}())

Shifter.Drawing = (function () {
  let canvas, context, renderFn,
    requestFrame = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60)
      }
  return {
    /**
     * 初始化
     * @param {dom|string} el document对象或字符串 
     */
    init (el) {
      if (typeof el == 'object') {
        canvas == el
      } else {
        canvas = document.querySelector(el)
      }
      context = canvas.getContext('2d')
      this.adjustCanvas()
      window.addEventListener('resize', () => this.adjustCanvas())
    },
    loop (fn) {
      renderFn = !renderFn ? fn : renderFn
      this.clearFrame()
      renderFn()
      requestFrame.call(window, this.loop.bind(this))
    },
    adjustCanvas () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    },
    clearFrame () {
      context.clearRect(0, 0, canvas.width, canvas.height)
    },
    getArea () {
      return { w: canvas.width, h: canvas.height }
    },
    drawCircle (point, c) {
      context.fillStyle = c.render()
      context.beginPath()
      context.arc(point.x, point.y, point.r, 0, 2 * Math.PI, true)
      context.closePath()
      context.fill()
    }
  }
}())

/**
 * 生成点的初始化数据
 * @param {object} args 点参数对象
 */
Shifter.Point = function (args) {
  this.x = args.x
  this.y = args.y
  this.r = args.r
  this.a = args.a
  this.h = args.h
}

Shifter.Color = function (red, green, blue, alpha) {
  this.red = red
  this.green = green
  this.blue = blue
  this.alpha = alpha
}

Shifter.Color.prototype = {
  render () {
    return `rgba(${this.red},${this.green},${this.blue},${this.alpha})`
  }
}

Shifter.Dot = function (x, y, r = 5) {
  this.point = new Shifter.Point({
    x, y, r, a: 1, h: 0
  })
  this.e = 0.07
  this.s = true
  this.color = new Shifter.Color(255, 255, 255, this.point.a)
  this.t = this.clone()
  this.q = []
}

Shifter.Dot.prototype = {
  clone () {
    return new Shifter.Point({
      x: this.x,
      y: this.y,
      r: this.r,
      a: this.a,
      h: this.h
    })
  },
  _draw () {
    this.color.alpha = this.point.a
    Shifter.Drawing.drawCircle(this.point, this.color)
  },
  _moveTowards (n) {
    let details = this.distanceTo(n, true),
      dx = details[0],
      dy = details[1],
      d = details[2],
      e = this.e * d
    if (this.point.h === -1) {
      this.point.x = n.x
      this.point.y = n.y
      return true
    } else if (d > 1) {
      this.point.x -= ((dx / d) * e)
      this.point.y -= ((dy / d) * e)
    } else if (this.point.h > 0) {
      this.point.h--
    } else {
      return true
    }
    return false
  },
  _update () {
    let point, d
    if (this._moveTowards(this.t)) {
      point = this.q.shift()
      if (point) {
        this.t.x = point.x || this.point.x
        this.t.y = point.y || this.point.y
        this.t.r = point.r || this.point.r
        this.t.a = point.a || this.point.a
        this.point.h = point.h || 0
      } else if (this.s) {
        this.point.x -= Math.sin(Math.random() * 3.142)
        this.point.y -= Math.sin(Math.random() * 3.142)
      } else {
        this.move(new Shifter.Point({
          x: this.point.x + (Math.random() * 50) - 25,
          y: this.point.y + (Math.random() * 50) - 25
        }))
      }
    }
    d = this.point.a - this.t.a
    this.point.a = Math.max(0.1, this.point.a - (d * 0.05))
    d = this.point.r - this.t.r
    this.point.r = Math.max(1, this.point.r - (d * 0.05))
  },
  distanceTo (n, details) {
    let dx = this.point.x - n.x,
      dy = this.point.y - n.y,
      d = Math.sqrt(dx * dx + dy * dy)
    return details ? [dx, dy, d] : d
  },
  move (point, avoidStatic) {
    if (!avoidStatic || (avoidStatic && this.distanceTo(point) > 1)) {
      this.q.push(point)
    }
  },
  render () {
    this._update()
    this._draw()
  }
}

Shifter.Builder = (function () {
  let gap = 13,
    shapeCanvas = document.createElement('canvas'),
    shapeContext = shapeCanvas.getContext('2d'),
    fontSize = 500,
    fontFamily = 'Avenir, Helvetica Neue, Helvetica, Arial, sans-serif'
  function fit () {
    shapeCanvas.width = Math.floor(window.innerWidth / gap) * gap
    shapeCanvas.height = Math.floor(window.innerHeight / gap) * gap
    shapeContext.fillStyle = 'red'
    shapeContext.textBaseline = 'middle'
    shapeContext.textAlign = 'center'
  }
  function getGray (red, green, blue) {
    return 0.299 * red + 0.578 * green + 0.114 * blue;
  }
  function getRadius (gray) {
    if (gray <= 40) {
      return 6
    } else if (gray > 40 && gray <= 80) {
      return 5
    } else if (gray > 80 && gray <= 120) {
      return 4
    } else if (gray > 120 && gray <= 160) {
      return 3
    } else if (gray > 160 && gray <= 200) {
      return 2
    } else if (gray > 200 && gray <= 240) {
      return 1
    } else {
      return 0
    }
  }
  function scalingImage (imgWidth, imgHeight, containerWidth, containerHeight) {
    var containerRatio = containerWidth / containerHeight
    var imgRatio = imgWidth / imgHeight
    if (imgRatio > containerRatio) {
      imgWidth = containerWidth
      imgHeight = containerWidth / imgRatio
    } else if (imgRatio < containerRatio) {
      imgHeight = containerHeight
      imgWidth = containerHeight * imgRatio
    } else {
      imgWidth = containerWidth
      imgHeight = containerHeight
    }
    return { width: imgWidth, height: imgHeight }
  }
  function processCanvas () {
    let [pixels, dots, x, y, fx, fy, w, h] = [shapeContext.getImageData(0, 0, shapeCanvas.width, shapeCanvas.height).data, [], 0, 0, shapeCanvas.width, shapeCanvas.height, 0, 0]
    for (let px = 0; px < pixels.length; px += (4 * gap)) {
      let r = getRadius(getGray(pixels[px], pixels[px + 1], pixels[px + 2]))
      if (pixels[px + 3] > 0 && r > 0) {
        dots.push(new Shifter.Point({ x, y, r }))
        w = Math.max(x, w)
        h = Math.max(y, h)
        fx = Math.min(x, fx)
        fy = Math.min(y, fy)
      }
      x += gap
      if (x >= shapeCanvas.width) {
        x = 0
        y += gap
        px += gap * 4 * shapeCanvas.width
      }
    }
    return { dots, w: w + fx, h: h + fy }
  }

  function setFontSize (size) {
    shapeContext.font = 'bold ' + size + 'px ' + fontFamily
  }

  function isNumber (n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  }

  return {
    init () {
      fit()
      window.addEventListener('resize', fit)
    },
    imageFile (url, callback) {
      let area = Shifter.Drawing.getArea(),
        image = new Image()
      image.src = url
      image.onload = function () {
        let size = scalingImage(image.width, image.height, area.w * 0.8, area.h * 0.8)
        shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height)
        shapeContext.drawImage(this, 0, 0, size.width, size.height)
        callback(processCanvas())
      }
      image.onerror = function () {
        callback(Shifter.Builder.letter('What?'))
      }
    },
    circle (d) {
      let r = Math.max(0, d) / 2
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height)
      shapeContext.beginPath()
      shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false)
      shapeContext.fill()
      shapeContext.closePath()
      return processCanvas()
    },
    letter (l) {
      let s = 0
      setFontSize(fontSize)
      s = Math.min(fontSize, (shapeCanvas.width / shapeContext.measureText(l).width) * 0.8 * fontSize, (shapeCanvas.height / fontSize) * (isNumber(l) ? 1 : 0.45) * fontSize)
      setFontSize(s)
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height)
      shapeContext.fillText(l, shapeCanvas.width / 2, shapeCanvas.height / 2)
      return processCanvas()
    },
    rectangle (w, h) {
      let [dots, width, height] = [[], gap * w, gap * h]
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          dots.push(new Shifter.Point({ x, y, r: 5 }))
        }
      }
      return { dots, w: width, h: height }
    }
  }
}())

Shifter.Shape = (function () {
  let [dots, width, height, cx, cy] = [[], 0, 0, 0, 0]
  function compensate () {
    let area = Shifter.Drawing.getArea()
    cx = area.w / 2 - width / 2
    cy = area.h / 2 - height / 2
  }
  return {
    shuffleIdle () {
      let area = Shifter.Drawing.getArea()
      for (let i = 0; i < dots.length; i++) {
        if (!dots[i].s) {
          dots[i].move({
            x: Math.random() * area.w,
            y: Math.random() * area.h
          })
        }
      }
    },
    switchShape (n, fast) {
      let size,
        area = Shifter.Drawing.getArea(),
        d = 0
      width = n.w
      height = n.h
      compensate()
      if (n.dots.length > dots.length) {
        size = n.dots.length - dots.length
        for (let i = 0; i < size; i++) {
          dots.push(new Shifter.Dot(area.w / 2, area.h / 2))
        }
      }
      while (n.dots.length > 0) {
        let i = Math.floor(Math.random() * n.dots.length)
        dots[d].e = fast ? 0.25 : (dots[d].s ? 0.14 : 0.11)
        if (dots[d].s) {
          dots[d].move(new Shifter.Point({
            r: Math.random() * 20 + 10,
            a: Math.random(),
            h: 18
          }))
        } else {
          dots[d].move(new Shifter.Point({
            r: Math.random() * 5 + 5,
            h: fast ? 18 : 30
          }))
        }
        dots[d].s = true
        dots[d].move(new Shifter.Point({
          x: n.dots[i].x + cx,
          y: n.dots[i].y + cy,
          r: n.dots[i].r,
          a: 1,
          h: 0
        }))
        n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1))
        d++
      }
      for (let i = d; i < dots.length; i++) {
        if (dots[i].s) {
          dots[i].move(new Shifter.Point({
            r: Math.random() * 20 + 10,
            a: Math.random(),
            h: 20
          }))
          dots[i].s = false
          dots[i].e = 0.04
          dots[i].move(new Shifter.Point({
            x: Math.random() * area.w,
            y: Math.random() * area.h,
            r: Math.random() * 4,
            a: 0.3,
            h: 0
          }))
        }
      }
    },
    render () {
      for (let i = 0; i < dots.length; i++) {
        dots[i].render()
      }
    }
  }
}())
