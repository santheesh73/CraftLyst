const canvas = document.querySelector('canvas');
canvas.setAttribute('aria-label', 'Spring sale ends Friday');
canvas.setAttribute('role', 'img');
const ctx = canvas.getContext('2d');
ctx.fillText('Spring sale ends Friday', 10, 40);
