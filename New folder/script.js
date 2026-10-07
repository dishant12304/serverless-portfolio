// ==========================================================
// Config — point this at your API Gateway endpoint once deployed
// ==========================================================
const API_ENDPOINT = "https://hgigtu0ce6.execute-api.ap-south-1.amazonaws.com/contact";

// ==========================================================
// Nav: scroll shadow + mobile toggle
// ==========================================================
const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
const navLinks = document.querySelector(".nav-links");

window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

navToggle?.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => navLinks.classList.remove("open"));
});

// ==========================================================
// Scroll reveal (single reusable observer, not scattered per-element logic)
// ==========================================================
const revealTargets = document.querySelectorAll(
  ".section-head, .about-card, .flow-step"
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

revealTargets.forEach((el) => revealObserver.observe(el));

// ==========================================================
// Animated stat counters in the hero
// ==========================================================
const counters = document.querySelectorAll("[data-count]");

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      counters.forEach(animateCount);
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.5 });

const statsRoot = document.querySelector(".hero-stats");
if (statsRoot) statsObserver.observe(statsRoot);

// ==========================================================
// Architecture flow: highlight steps as they scroll into view
// ==========================================================
const flowSteps = document.querySelectorAll(".flow-step");
const flowObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("active", entry.isIntersecting);
    });
  },
  { threshold: 0.6 }
);
flowSteps.forEach((step) => flowObserver.observe(step));

// ==========================================================
// Hero visual: lightweight network canvas
// represents request paths between edge nodes (S3 / CDN / Lambda)
// ==========================================================
const canvas = document.getElementById("network");

if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const ctx = canvas.getContext("2d");
  let width, height, nodes;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
  }

  function makeNodes(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 1.4,
      });
    }
    return arr;
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    // move
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
    });

    // connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const maxDist = 130;
        if (dist < maxDist) {
          ctx.strokeStyle = `rgba(255,159,28,${0.16 * (1 - dist / maxDist)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    nodes.forEach((n) => {
      ctx.fillStyle = "rgba(231,234,244,0.55)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(step);
  }

  resize();
  nodes = makeNodes(34);
  step();
  window.addEventListener("resize", () => {
    resize();
  }, { passive: true });
}

// ==========================================================
// Contact form → API Gateway → Lambda
// ==========================================================
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    message: form.message.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  status.textContent = "";
  status.className = "form-status";

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Request failed");

    status.textContent = "Message sent. I'll get back to you soon.";
    status.classList.add("ok");
    form.reset();
  } catch (err) {
    status.textContent =
      "Couldn't send that — check the API_ENDPOINT in script.js is deployed and correct.";
    status.classList.add("err");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send message";
  }
});


// Visitor counter
async function updateVisitorCount() {
  try {
    const response = await fetch('https://hgigtu0ce6.execute-api.ap-south-1.amazonaws.com/count');
    const data = await response.json();
    document.getElementById('visitor-count').setAttribute('data-count', data.count);
document.getElementById('visitor-count').innerText = data.count;
  } catch (error) {
    console.error('Error:', error);
  }
}

updateVisitorCount();


// Contact form
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;
  
  try {
    const response = await fetch('https://hgigtu0ce6.execute-api.ap-south-1.amazonaws.com/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, message })
    });
    
    const data = await response.json();
    alert('Message sent successfully!');
  } catch (error) {
    alert('Error sending message. Please try again.');
  }
});