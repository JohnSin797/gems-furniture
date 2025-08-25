const Footer = () => {
  return (
    <footer className="bg-charcoal text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-2xl font-bold mb-4">Luxe Home</h3>
            <p className="text-white/70 mb-6">
              Creating beautiful, functional spaces with timeless furniture pieces.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center cursor-pointer hover:bg-sage-light transition-colors">
                <span className="text-sm font-bold">f</span>
              </div>
              <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center cursor-pointer hover:bg-sage-light transition-colors">
                <span className="text-sm font-bold">@</span>
              </div>
              <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center cursor-pointer hover:bg-sage-light transition-colors">
                <span className="text-sm font-bold">in</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Living Room</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Bedroom</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Dining Room</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Office</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Sale</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Shipping Info</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Returns</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Size Guide</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors">Care Instructions</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Stay Updated</h4>
            <p className="text-white/70 mb-4">Get the latest designs and exclusive offers.</p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-l focus:outline-none focus:border-sage text-white placeholder-white/50"
              />
              <button className="px-6 py-2 bg-sage hover:bg-sage-light text-white rounded-r transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/70 text-sm">© 2024 Luxe Home. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;