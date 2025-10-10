import heroImage from "@/assets/hero-furniture.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4 py-12 sm:py-16 md:py-20">
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          Timeless Design
          <br />
          <span className="text-sage-light">For Every Home</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
          Discover our curated collection of premium furniture that transforms houses into homes
        </p>
      </div>
    </section>
  );
};

export default Hero;