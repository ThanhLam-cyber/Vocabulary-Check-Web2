function Item({ image, title, desciption }) {
  return (
    <div className="h-96 mb-[80px]">
      <img className="w-full  h-full rounded-lg object-cover " src={image} alt="" />
      <h3 className="text-center text-[#ffa400] font-medium text-xl my-3">{title}</h3>
      <span className="block text-center text-gray-400 text-sm">{desciption}</span>
    </div>
  );
}
export default Item;
