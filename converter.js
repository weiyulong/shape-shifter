class converter {
  constructor(el) {
    this.canvas = typeof el == 'string' ? document.querySelector(el) : el
    this.context = canvas.getContext('2d')
    this.dots = []
  }
  load (path) {
    let _this = this
    let img = new Image()
    img.src = path
    img.onload = function () {
      _this.context.clearRect(0, 0, _this.canvas.width, _this.canvas.height)
      _this.canvas.width = img.width
      _this.canvas.height = img.height
      _this.context.drawImage(img, 0, 0)
      let imgData = _this.context.getImageData(0, 0, img.width, img.height).data
      _this.dots = []
      for (let h = 0; h < img.height; h += 15) {
        for (let w = 0; w < img.width; w += 15) {
          let index = (w + h * img.width) * 4
          let red = imgData[index]
          let green = imgData[index + 1]
          let blue = imgData[index + 2]
          let alpha = imgData[index + 3]
          if (alpha > 0) {
            let gray = getGray(red, green, blue)
            let radius = getRadius(gray)
            if (radius > 0) {
              _this.dots.push({ x: w, y: h, r: getRadius(gray) })
            }
          }
        }
      }
      _this.output()
    }
    function getGray (red, green, blue) {
      return ~~(0.299 * red + 0.578 * green + 0.114 * blue)
    }
    function getRadius (gray) {
      if (gray <= 35) {
        return 7
      } else if (gray > 35 && gray <= 70) {
        return 6
      } else if (gray > 70 && gray <= 105) {
        return 5
      } else if (gray > 105 && gray <= 140) {
        return 4
      } else if (gray > 140 && gray <= 175) {
        return 3
      } else if (gray > 175 && gray <= 210) {
        return 2
      } else if (gray > 210 && gray <= 245) {
        return 1
      } else {
        return 0
      }
    }
  }
  output (color = 'rgba(255,255,255,0.75)') {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    while (this.dots.length > 0) {
      let dot = this.dots.shift()
      this.context.fillStyle = color
      this.context.beginPath()
      this.context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2, true)
      this.context.closePath()
      this.context.fill()
    }
  }
}