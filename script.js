 const services = [
  { name: "Plumbing", price: 500 },
  { name: "Cleaning", price: 300 },
  { name: "Electrical", price: 700 }
];

// 1. Arrow function and template literal
const greet = (name) => `Hello, ${name}!`;
console.log(greet("Cynaris Intern"));

// 2. Object destructuring
const { name, price } = services[0];
console.log(`${name} costs ₹${price}`);

// 3. map() - get service names
const serviceNames = services.map(service => service.name);
console.log(serviceNames);

// 4. filter() - affordable services
const affordable = services.filter(service => service.price <= 500);
console.log(affordable);

// 5. reduce() - total price
const total = services.reduce(
  (sum, service) => sum + service.price, 0
);
console.log(`Total price: ₹${total}`);

// 6. Interactive component using an event listener
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("myButton");

  if (button) {
    button.addEventListener("click", () => {
      alert("JavaScript is working!");
    });
  }
});
