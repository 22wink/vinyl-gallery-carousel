;(function () {
  if (!window.gsap || !window.Draggable) {
    console.error("GSAP 或 Draggable 未加载，无法初始化画廊。")
    return
  }

  const gsap = window.gsap
  const Draggable = window.Draggable

  const ASSET_BASE = "./public"
  const STORAGE_KEYS = {
    reflection: "carousel-reflection-type",
    textureMode: "carousel-texture-mode",
    texture: "carousel-selected-texture",
  }

  const COVERS = [
    "/arts/art1.jpg",
    "/arts/art2.jpg",
    "/arts/art3.jpg",
    "/arts/art4.jpg",
    "/arts/art5.jpg",
    "/arts/art6.jpg",
    "/arts/art7.jpg",
    "/arts/art8.jpg",
    "/arts/art9.jpg",
    "/arts/art10.jpg",
    "/arts/art11.jpg",
    "/arts/art12.jpg",
    "/arts/art13.jpg",
    "/arts/art14.jpg",
    "/arts/art15.jpg",
    "/arts/art16.jpg",
    "/arts/art17.jpg",
    "/arts/art18.jpg",
    "/arts/art19.jpg",
    "/arts/art20.jpg",
    "/arts/art21.jpg",
    "/arts/art22.jpg",
    "/arts/art23.jpg",
    "/arts/art24.jpg",
    "/arts/art25.jpg",
    "/arts/art26.jpg",
    "/arts/art27.jpg",
    "/arts/art28.jpg",
    "/arts/art29.jpg",
    "/arts/art30.jpg",
    "/arts/art31.jpg",
    "/arts/art32.jpg",
    "/arts/art33.jpg",
    "/arts/art34.jpg",
    "/arts/art35.jpg",
    "/arts/art36.jpg",
    "/arts/art37.jpg",
    "/arts/art38.jpg",
    "/arts/art39.jpg",
    "/arts/art40.jpg",
    "/arts/art41.jpg",
  ].map((path) => `${ASSET_BASE}${path}`)

  const TEXTURE_LIST = [
    "/img/aa1.png",
    "/img/aa2.png",
    "/img/aa4.png",
    "/img/aa5.png",
    "/img/aa6.png",
    "/img/aa7.png",
    "/img/aa8.png",
    "/img/aa9.png",
    "/img/aa10.png",
    "/img/aa11.png",
    "/img/aa12.jpg",
    "/img/aa13.jpg",
    "/img/disccc.jpg",
    "/img/discc.jpg",
    "/img/disc.jpg",
  ].map((path) => `${ASSET_BASE}${path}`)

  const storage = {
    get(key, fallback) {
      try {
        const value = window.localStorage.getItem(key)
        return value ?? fallback
      } catch {
        return fallback
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        /* 忽略本地存储异常 */
      }
    },
  }

  const initialReflection = storage.get(STORAGE_KEYS.reflection, "mirror")
  const initialTextureMode = storage.get(STORAGE_KEYS.textureMode, "all")
  const initialTexture = storage.get(STORAGE_KEYS.texture, TEXTURE_LIST[0] ?? "")

  const state = {
    reflectionType: ["mirror", "realistic", "none"].includes(initialReflection) ? initialReflection : "mirror",
    textureMode: ["all", "random", "off"].includes(initialTextureMode) ? initialTextureMode : "all",
    selectedTexture: TEXTURE_LIST.includes(initialTexture) ? initialTexture : TEXTURE_LIST[0] ?? "",
  }

  const reflectionOptionsEl = document.getElementById("reflectionOptions")
  const textureModeOptionsEl = document.getElementById("textureModeOptions")
  const textureGridEl = document.getElementById("textureGrid")
  const randomHintEl = document.getElementById("randomHint")
  const panelEl = document.getElementById("settingsPanel")
  const panelTitleBar = document.getElementById("panelTitleBar")
  const panelToggleBtn = document.getElementById("panelToggleBtn")
  const boxesEl = document.getElementById("carouselBoxes")
  const wrapperEl = document.querySelector(".vinyl-carousel-wrapper")
  const prevBtn = document.querySelector(".controls .prev")
  const nextBtn = document.querySelector(".controls .next")
  const keyboardPrevBtn = document.querySelector('[data-key="a"]')
  const keyboardNextBtn = document.querySelector('[data-key="d"]')

  const reflectionButtons = new Map()
  const textureModeButtons = new Map()
  const textureThumbButtons = new Map()
  const randomTextures = COVERS.map(
    () => TEXTURE_LIST[Math.floor(Math.random() * TEXTURE_LIST.length)] ?? null,
  )

  const itemWidth = 220
  const itemGap = 40
  const rotationAmount = -40
  const focusedScale = 1.4
  const focusedTranslateY = 20
  const focusedTranslateZ = 80
  const adjacentScale = 1.02

  let centerOffset = 0
  let animation = null
  let draggable = null
  let activeIndex = Math.floor(COVERS.length / 2)
  let lastKeyAction = 0
  let isPanelMinimized = true
  let isDraggingPanel = false
  let dragOffset = { x: 0, y: 0 }

  const boxElements = []

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  function buildCarousel() {
    boxesEl.innerHTML = ""
    boxElements.length = 0

    COVERS.forEach((cover, index) => {
      const box = document.createElement("div")
      box.className = `box reflection-${state.reflectionType}`
      box.addEventListener("click", () => {
        activeIndex = index
        animateTo(index, 0.2)
      })

      const vinyl = document.createElement("div")
      vinyl.className = "vinyl-item"

      const img = document.createElement("img")
      img.src = cover
      img.alt = `Album ${index + 1}`

      vinyl.appendChild(img)
      box.appendChild(vinyl)
      boxesEl.appendChild(box)
      boxElements.push(box)
    })

    applyTexturesToItems()
  }

  function calculateCenterOffset() {
    centerOffset = wrapperEl.offsetWidth / 2 - itemWidth / 2
  }

  function updateVisuals(currentIndexFloat) {
    boxElements.forEach((box, index) => {
      const distance = index - currentIndexFloat
      const absDistance = Math.abs(distance)
      const isCenter = absDistance < 0.5
      const isLeftNeighbor = Math.round(distance) === -1 && absDistance >= 0.5 && absDistance < 1.5
      const isRightNeighbor = Math.round(distance) === 1 && absDistance >= 0.5 && absDistance < 1.5

      box.classList.toggle("is-active", isCenter)

      const props = {
        rotationY: 0,
        rotationX: 0,
        z: 0,
        scale: 1,
        y: 0,
        zIndex: 1,
        filter: "blur(0px)",
        transformOrigin: "center center",
        duration: 0.03,
        ease: "power1.out",
        overwrite: true,
        force3D: true,
        immediateRender: false,
      }

      if (isCenter) {
        props.scale = focusedScale
        props.y = focusedTranslateY
        props.z = focusedTranslateZ
        props.zIndex = 100
      } else if (isLeftNeighbor || isRightNeighbor) {
        props.rotationY = isLeftNeighbor ? rotationAmount : -rotationAmount
        props.z = 150
        props.scale = adjacentScale
        props.zIndex = 60
        props.transformOrigin = "center 50%"
      } else {
        props.zIndex = 100 - Math.round(absDistance * 10)
        props.y = 8
        props.filter = `blur(${absDistance > 2.5 ? Math.min((absDistance - 2.5) * 0.8, 4) : 0}px)`
      }

      gsap.to(box, props)
    })
  }

  function animateTo(index, duration) {
    if (animation) {
      animation.kill()
    }

    animation = gsap.to(boxesEl, {
      x: centerOffset - index * (itemWidth + itemGap),
      duration,
      ease: "power2.out",
      force3D: true,
      overwrite: true,
      onUpdate: () => {
        const currentX = gsap.getProperty(boxesEl, "x")
        const currentIndexFloat = -(currentX - centerOffset) / (itemWidth + itemGap)
        updateVisuals(currentIndexFloat)
      },
      onComplete: () => {
        activeIndex = index
      },
    })
  }

  function goToPrev() {
    const newIndex = Math.max(0, activeIndex - 1)
    if (newIndex !== activeIndex) {
      activeIndex = newIndex
      animateTo(newIndex, 0.15)
    }
  }

  function goToNext() {
    const newIndex = Math.min(COVERS.length - 1, activeIndex + 1)
    if (newIndex !== activeIndex) {
      activeIndex = newIndex
      animateTo(newIndex, 0.15)
    }
  }

  function handleResize() {
    calculateCenterOffset()
    gsap.set(boxesEl, {
      x: centerOffset - activeIndex * (itemWidth + itemGap),
      force3D: true,
    })
    updateVisuals(activeIndex)
  }

  function handleWheel(event) {
    event.preventDefault()
    const currentX = gsap.getProperty(boxesEl, "x")
    const scrollAmount = event.deltaY * 0.5
    const newX = currentX - scrollAmount
    const minX = centerOffset - (COVERS.length - 1) * (itemWidth + itemGap)
    const maxX = centerOffset
    const clampedX = clamp(newX, minX, maxX)

    gsap.to(boxesEl, {
      x: clampedX,
      duration: 0.2,
      ease: "power1.out",
      overwrite: "auto",
      force3D: true,
      onUpdate: () => {
        const updatedX = gsap.getProperty(boxesEl, "x")
        const currentIndexFloat = -(updatedX - centerOffset) / (itemWidth + itemGap)
        updateVisuals(currentIndexFloat)

        const nearestIndex = Math.round(currentIndexFloat)
        const clampedIndex = clamp(nearestIndex, 0, COVERS.length - 1)
        if (clampedIndex !== activeIndex) {
          activeIndex = clampedIndex
        }
      },
    })
  }

  function getTextureForIndex(index) {
    if (state.textureMode === "off") return null
    if (state.textureMode === "all") return state.selectedTexture
    if (state.textureMode === "random") return randomTextures[index]
    return null
  }

  function applyTexturesToItems() {
    boxElements.forEach((box, index) => {
      const vinyl = box.querySelector(".vinyl-item")
      const texture = getTextureForIndex(index)
      if (vinyl) {
        if (texture) {
          vinyl.dataset.texture = "texture"
          vinyl.style.setProperty("--texture-url", `url(${texture})`)
        } else {
          vinyl.dataset.texture = "none"
          vinyl.style.setProperty("--texture-url", "none")
        }
      }
    })
  }

  function updateBoxReflectionClasses() {
    boxElements.forEach((box) => {
      box.classList.remove("reflection-mirror", "reflection-realistic", "reflection-none")
      box.classList.add(`reflection-${state.reflectionType}`)
    })
  }

  function setReflectionType(type) {
    if (state.reflectionType === type) return
    state.reflectionType = type
    storage.set(STORAGE_KEYS.reflection, type)
    updateReflectionButtons()
    updateBoxReflectionClasses()
  }

  function updateReflectionButtons() {
    reflectionButtons.forEach((btn, type) => {
      btn.classList.toggle("is-active", state.reflectionType === type)
    })
  }

  function setTextureMode(mode) {
    if (state.textureMode === mode) return
    state.textureMode = mode
    storage.set(STORAGE_KEYS.textureMode, mode)
    updateTextureModeButtons()
    updateTextureUIVisibility()
    applyTexturesToItems()
  }

  function updateTextureModeButtons() {
    textureModeButtons.forEach((btn, mode) => {
      btn.classList.toggle("is-active", state.textureMode === mode)
    })
  }

  function updateTextureUIVisibility() {
    if (state.textureMode === "all") {
      textureGridEl.classList.remove("is-hidden")
      randomHintEl.classList.remove("is-visible")
    } else if (state.textureMode === "random") {
      textureGridEl.classList.add("is-hidden")
      randomHintEl.classList.add("is-visible")
    } else {
      textureGridEl.classList.add("is-hidden")
      randomHintEl.classList.remove("is-visible")
    }
  }

  function setSelectedTexture(texture) {
    if (state.selectedTexture === texture) return
    state.selectedTexture = texture
    storage.set(STORAGE_KEYS.texture, texture)
    updateTextureThumbnails()
    applyTexturesToItems()
  }

  function updateTextureThumbnails() {
    textureThumbButtons.forEach((btn, texture) => {
      btn.classList.toggle("is-selected", state.selectedTexture === texture)
    })
  }

  function buildReflectionOptions() {
    const options = [
      {
        value: "mirror",
        label: "镜像",
        icon: '<rect x="4" y="4" width="16" height="8" rx="2"></rect><rect x="4" y="14" width="16" height="8" rx="2" opacity="0.3"></rect>',
      },
      {
        value: "realistic",
        label: "真实",
        icon: '<rect x="4" y="4" width="16" height="8" rx="2"></rect><ellipse cx="12" cy="18" rx="8" ry="4" opacity="0.2"></ellipse>',
      },
      {
        value: "none",
        label: "无",
        icon: '<rect x="4" y="4" width="16" height="8" rx="2"></rect><line x1="2" y1="22" x2="22" y2="2" stroke="#FF4444" stroke-width="2"></line>',
      },
    ]

    options.forEach((option) => {
      const button = document.createElement("button")
      button.className = "panel-button"
      button.type = "button"
      button.innerHTML = `
        <span class="button-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">${option.icon}</svg>
        </span>
        <span class="button-label">${option.label}</span>
      `
      button.addEventListener("click", () => setReflectionType(option.value))
      reflectionOptionsEl.appendChild(button)
      reflectionButtons.set(option.value, button)
    })

    updateReflectionButtons()
  }

  function buildTextureModeOptions() {
    const options = [
      {
        value: "all",
        label: "全部",
        icon: '<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"></rect><path d="M4 10h16M4 14h16" stroke="currentColor" stroke-width="2"></path>',
      },
      {
        value: "random",
        label: "随机",
        icon: '<path d="M18 4l3 3-3 3M18 17l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M3 7h11a4 4 0 014 4v0a4 4 0 01-4 4H3M3 17h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
      },
      {
        value: "off",
        label: "关闭",
        icon: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"></circle><path d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>',
      },
    ]

    options.forEach((option) => {
      const button = document.createElement("button")
      button.className = "texture-mode-button"
      button.type = "button"
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">${option.icon}</svg>
        <span>${option.label}</span>
      `
      button.addEventListener("click", () => setTextureMode(option.value))
      textureModeOptionsEl.appendChild(button)
      textureModeButtons.set(option.value, button)
    })

    updateTextureModeButtons()
    updateTextureUIVisibility()
  }

  function buildTextureGrid() {
    textureGridEl.innerHTML = ""
    textureThumbButtons.clear()

    TEXTURE_LIST.forEach((texture) => {
      const button = document.createElement("button")
      button.className = "texture-thumb"
      button.type = "button"
      button.innerHTML = `
        <img src="${texture}" alt="Texture" />
        <svg viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
        </svg>
      `
      button.addEventListener("click", () => setSelectedTexture(texture))
      textureGridEl.appendChild(button)
      textureThumbButtons.set(texture, button)
    })

    updateTextureThumbnails()
  }

  function initPanelToggle() {
    const minimizeIcon = `
      <svg viewBox="0 0 20 20" width="14" height="14">
        <line x1="2" y1="18" x2="18" y2="18" stroke-width="4" stroke-linecap="round" />
      </svg>
    `
    const maximizeIcon = `
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M5 2H1v13h10v-4h4V5H9V1H5zm7 4v7H2V3h3V2h7v3H9v4h3z" fill="currentColor" />
      </svg>
    `

    function renderIcon() {
      panelToggleBtn.innerHTML = isPanelMinimized ? maximizeIcon : minimizeIcon
      panelToggleBtn.setAttribute("aria-label", isPanelMinimized ? "展开面板" : "收起面板")
      panelToggleBtn.setAttribute("aria-expanded", String(!isPanelMinimized))
    }

    function togglePanel() {
      isPanelMinimized = !isPanelMinimized
      panelEl.classList.toggle("is-minimized", isPanelMinimized)
      renderIcon()
    }

    panelEl.classList.toggle("is-minimized", isPanelMinimized)
    renderIcon()
    panelToggleBtn.addEventListener("click", (event) => {
      event.stopPropagation()
      togglePanel()
    })
  }

  function initPanelDrag() {
    panelTitleBar.addEventListener("mousedown", (event) => {
      if (event.target === panelToggleBtn) return
      isDraggingPanel = true
      panelEl.classList.add("is-dragging")
      dragOffset = {
        x: event.clientX - panelEl.offsetLeft,
        y: event.clientY - panelEl.offsetTop,
      }
    })

    window.addEventListener("mousemove", (event) => {
      if (!isDraggingPanel) return
      const panelWidth = panelEl.offsetWidth
      const panelHeight = panelEl.offsetHeight
      const newX = clamp(event.clientX - dragOffset.x, 0, window.innerWidth - panelWidth)
      const newY = clamp(event.clientY - dragOffset.y, 0, window.innerHeight - panelHeight)
      panelEl.style.left = `${newX}px`
      panelEl.style.top = `${newY}px`
    })

    window.addEventListener("mouseup", () => {
      if (!isDraggingPanel) return
      isDraggingPanel = false
      panelEl.classList.remove("is-dragging")
    })
  }

  function initKeyboard() {
    const THROTTLE_DELAY = 100

    function activateButton(button) {
      if (!button) return
      button.classList.add("active")
      setTimeout(() => button.classList.remove("active"), 150)
    }

    window.addEventListener("keydown", (event) => {
      const now = Date.now()
      if (now - lastKeyAction < THROTTLE_DELAY) return
      const key = event.key.toLowerCase()

      if (key === "a") {
        lastKeyAction = now
        activateButton(keyboardPrevBtn)
        goToPrev()
      }

      if (key === "d") {
        lastKeyAction = now
        activateButton(keyboardNextBtn)
        goToNext()
      }
    })

    keyboardPrevBtn?.addEventListener("click", () => {
      activateButton(keyboardPrevBtn)
      goToPrev()
    })

    keyboardNextBtn?.addEventListener("click", () => {
      activateButton(keyboardNextBtn)
      goToNext()
    })
  }

  function initCarousel() {
    gsap.registerPlugin(Draggable)
    calculateCenterOffset()

    gsap.set(boxesEl, {
      x: centerOffset - activeIndex * (itemWidth + itemGap),
      force3D: true,
    })
    updateVisuals(activeIndex)

    draggable = Draggable.create(boxesEl, {
      type: "x",
      edgeResistance: 0.65,
      inertia: false,
      bounds: {
        minX: centerOffset - (COVERS.length - 1) * (itemWidth + itemGap),
        maxX: centerOffset,
      },
      onDrag() {
        const currentIndexFloat = -(this.x - centerOffset) / (itemWidth + itemGap)
        updateVisuals(currentIndexFloat)
      },
      onDragEnd() {
        const newIndex = Math.round(-(this.x - centerOffset) / (itemWidth + itemGap))
        const clampedIndex = clamp(newIndex, 0, COVERS.length - 1)
        activeIndex = clampedIndex
        animateTo(clampedIndex, 0.2)
      },
    })[0]

    window.addEventListener("resize", handleResize)
    wrapperEl.addEventListener("wheel", handleWheel, { passive: false })
    prevBtn?.addEventListener("click", goToPrev)
    nextBtn?.addEventListener("click", goToNext)
  }

  function init() {
    buildReflectionOptions()
    buildTextureModeOptions()
    buildTextureGrid()
    buildCarousel()
    updateBoxReflectionClasses()
    initPanelToggle()
    initPanelDrag()
    initKeyboard()
    initCarousel()
  }

  init()
})()

