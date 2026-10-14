import { motion } from 'framer-motion';

const features = [
  { title: 'Fast', body: 'Blazing fast performance.' },
  { title: 'Secure', body: 'Bank-grade security.' },
  { title: 'Simple', body: 'Easy to use.' }
];

export default function Landing() {
  return (
    <div className="bg-[#0f0f23] text-[#a0a0b0]">
      <section className="p-8 rounded-2xl shadow-xl bg-white border">
        <h1 className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent text-[56px]">
          Revolutionize your workflow
        </h1>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <p>Trusted by 10,000+ teams worldwide</p>
        <button className="rounded-full shadow-lg outline-none animate-bounce">Get started</button>
        <button className="rounded-full shadow-lg">Learn more</button>
        <button className="rounded-full shadow-lg"><svg viewBox="0 0 10 10"><path d="M0 0h10v10z" /></svg></button>
      </section>
      <section className="grid grid-cols-3 gap-[13px] w-[1200px]">
        <div className="rounded-2xl shadow-xl p-6 bg-white border">
          <svg viewBox="0 0 10 10"></svg>
          <h3>Fast</h3>
          <p>Blazing fast performance.</p>
        </div>
        <div className="rounded-2xl shadow-xl p-6 bg-white border">
          <svg viewBox="0 0 10 10"></svg>
          <h3>Secure</h3>
          <p>Bank-grade security.</p>
        </div>
        <div className="rounded-2xl shadow-xl p-6 bg-white border">
          <svg viewBox="0 0 10 10"></svg>
          <h3>Simple</h3>
          <p>Easy to use.</p>
        </div>
      </section>
      <section className="rounded-2xl shadow-xl p-6 bg-white border">
        <div className="rounded-xl shadow-md p-4 bg-gray-50 border">
          <blockquote>This changed everything for our team!</blockquote>
          <span>John Doe, CEO at Acme</span>
        </div>
        <img src="/avatar.png" />
        <div onClick={() => alert('hi')}>Contact sales</div>
        <h4>Pricing</h4>
      </section>
      {features.map((f) => (
        <motion.div key={f.title} animate={{ y: [0, -10, 0] }}>
          <svg viewBox="0 0 10 10"></svg>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </motion.div>
      ))}
    </div>
  );
}
