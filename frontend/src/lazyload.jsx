import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

const LazyImage = ({ imageId, endViewport, fetchImageBase64 }) => {
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.2,
  });

  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const defaultImg = "/ic_placeholder.svg";

  useEffect(() => {
    let timer;
    if (inView && endViewport && !loaded) {
        const loadImage = async () => {
          //const imageId = imgRef.current?.getAttribute('data-image-id') || dataImageId;
          setLoading(true);
          const base64 = await fetchImageBase64(imageId);
          setSrc(base64.img);
          setLoaded(true);
        };
        loadImage();
    }
    // return () => clearTimeout(timer);
  }, [inView, imageId, endViewport ]);

  return (
    <div ref={ref} className="image-container" >
          <img
            className={`${src ? 'loaded ' : ''}img-preview`}
            src={src || defaultImg }
          />
      
     <span className={ `${loaded || !loading ? "hide ":""}img-loading`}></span>
     </div>
  );
};

export default LazyImage;
